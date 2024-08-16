const {WebPubSubEventHandler} = require('@azure/web-pubsub-express');
const {GRAPHQL_TRANSPORT_WS_PROTOCOL} = require('graphql-ws');
const {EventEmitter} = require('events');
const createSocket = require('./AzureWebPubSubSocket');
const makeServerless = require('./makeServerless');
const {resolvers} = require('../SchemaWithMiddleware');
const {
    closeConnection,
    hasPubSubConnection,
    getSession,
    getLogger,
    CONSTANTS: {
        WEBSOCKET_INIT_TIMEOUT_IN_MILLIS,
        WEBSOCKET_CLOSE_CODES: {SERVER_SHUTDOWN, HOST_DISCONNECT, OTHER_HOST_DISCONNECT}
    },
    unWatchReadReceipt,
    unWatchAllChatSubscriptions,
    getChatReadReceiptsSubscriptionId,
    getUserAndTenantIdsFromDeviceId,
    getTenantShortCode,
    NotFoundError,
    removeConnectionFromGroups,
    listenForCompletes,
    listenForDisconnect,
    publishDisconnect
} = require('ohana-shared');

const logger = getLogger('AzureWebPubSubHandler');

const clientConnections = new Map();
let unsubscribeForDisconnections = null;
let unsubscribeForCompletes = null;

async function disconnect(connectionId, code, reason, publish = true) {
    if (clientConnections.has(connectionId)) {
        logger.debug(
            {metadata: {connectionId}},
            `Disconnecting ${connectionId}: ${code} / ${reason || 'UNKNOWN'} ...`
        );
        const {closed, emitter} = clientConnections.get(connectionId);
        await closed(code, reason);
        emitter.removeAllListeners();
        clientConnections.delete(connectionId);
        logger.debug({metadata: {connectionId}}, `Disconnected.`);

        // let the other hosts know about the disconnect since Azure won't
        if (publish && code !== SERVER_SHUTDOWN) {
            logger.debug(
                {metadata: {connectionId}},
                `Publishing disconnect event for ${connectionId} for other hosts...`
            );
            await publishDisconnect(connectionId);
            logger.debug(
                {metadata: {connectionId}},
                `Disconnect event published for ${connectionId}.`
            );
        }
    }
}

async function createHandler(executableSchema, hubName, webhookPath, allowedEndpoints = []) {
    logger.debug(`Listening for disconnect events from other hosts ...`);

    unsubscribeForDisconnections = await listenForDisconnect((connectionId) =>
        disconnect(connectionId, OTHER_HOST_DISCONNECT, 'Socket closed on another host.')
    );

    // listen for complete events from other remote hosts
    unsubscribeForCompletes = await listenForCompletes((connectionId, subscriptionId) => {
        if (clientConnections.has(connectionId)) {
            logger.debug(
                {connectionId, subscriptionId},
                `Received completion for ${connectionId} - ${subscriptionId} from remote host`
            );

            const {emitter} = clientConnections.get(connectionId);
            emitter.emit('message', {
                id: subscriptionId,
                type: 'complete'
            });
        }
    });

    return new WebPubSubEventHandler(hubName, {
        path: webhookPath,
        handleConnect: (req, res) => {
            logger.debug(
                {metadata: {connectionId: req.context.connectionId}},
                `Connect request for ${req.context.connectionId}`
            );
            // Pass back the correct subprotocol
            res.success({
                subprotocol: GRAPHQL_TRANSPORT_WS_PROTOCOL
            });
        },
        allowedEndpoints,
        onConnected: async (req) => {
            const {connectionId, userId} = req.context;
            logger.debug(
                {metadata: {connectionId}},
                `Connected event for ${connectionId} - User: ${userId}`
            );
            await createServerAndSocket(executableSchema, connectionId, {userId});
        },
        handleUserEvent: async (req, res) => {
            const {connectionId, userId} = req.context;
            logger.debug(
                {metadata: {connectionId, data: req.data}},
                `Incoming message for ${connectionId}`
            );

            if (!clientConnections.has(connectionId)) {
                logger.debug(
                    {
                        metadata: {
                            connectionId,
                            deviceId: userId
                        }
                    },
                    `Could not find ${connectionId}, creating new server ...`
                );
                await createServerAndSocket(executableSchema, connectionId, {userId});
            }

            const {emitter} = clientConnections.get(connectionId);
            emitter.emit('message', req.data);

            res.success();
        },
        onDisconnected: async (req) => {
            const {connectionId, userId} = req.context;
            logger.debug({metadata: {connectionId}}, `Disconnect event for ${connectionId}`);
            // drop the server/socket here and notify the other hosts that they need to do the same
            await disconnect(connectionId, HOST_DISCONNECT, req.reason);
            await unWatchConnectionReadReceipts(userId);
        }
    });
}

async function createServerAndSocket(executableSchema, connectionId, extra) {
    // an eventemitter to allow decoupling between the event handler and makeServer result
    const emitter = new EventEmitter();
    emitter.on('close', async (code, reason) => {
        logger.debug({metadata: {connectionId}}, 'Connection close requested ...');
        await disconnect(connectionId, code, reason);
    });

    logger.debug({metadata: {connectionId}}, `Creating server for ${connectionId} ...`);
    const server = makeServerless({
        schema: executableSchema,
        roots: resolvers,
        context: async (ctx) => {
            return await authorizeRequest(ctx, connectionId);
        },
        onDisconnect: async (ctx) => {
            const session = await authorizeRequest(ctx, connectionId);
            if (session) {
                const {userId, deviceId} = session;
                if (userId && deviceId) {
                    await removeConnectionFromGroups(connectionId);
                }
            }
        },
        connectionInitWaitTimeout: WEBSOCKET_INIT_TIMEOUT_IN_MILLIS
    });

    logger.debug({metadata: {connectionId}}, `Creating socket for ${connectionId} ...`);
    const socket = await createSocket(emitter, connectionId, false);

    logger.debug({metadata: {connectionId}}, `Opening server/socket for ${connectionId} ...`);
    const closed = await server.opened(socket, connectionId, extra);

    // hold onto the closed fn and eventemitter
    clientConnections.set(connectionId, {closed, emitter});
}

async function authorizeRequest(ctx, connectionId) {
    const sessionId = ctx?.connectionParams?.authorization
        ? ctx?.connectionParams?.authorization.replace('Bearer ', '')
        : null;
    logger.debug({metadata: {connectionId, sessionId}}, `Getting session for WS context`);
    const session = await getSession(sessionId);
    if (!session) {
        logger.error({metadata: {connectionId, sessionId}}, `Session not found`);
    }
    return session;
}

async function destroyHandler() {
    logger.debug('Closing complete listener...');
    await unsubscribeForCompletes();
    logger.debug('Closing disconnection listener...');
    await unsubscribeForDisconnections();
    logger.debug('Listener closed.');

    logger.debug('Force disconnections for all open connections ...');
    const disconnectPromises = Array.from(clientConnections.keys()).map((connectionId) => {
        // tell Azure to disconnect the entire WS and the client will start over
        logger.debug({metadata: {connectionId}}, `Forcing disconnect for ${connectionId} ...`);
        return closeConnection(connectionId, 'Server shutdown.');
    });
    await Promise.allSettled(disconnectPromises);
    logger.debug('Connections terminated.');

    clientConnections.clear();
}

async function unWatchConnectionReadReceipts(deviceId) {
    // get userId and tenant short code
    const userAndTenant = await getUserAndTenantIdsFromDeviceId(deviceId);
    if (!userAndTenant) {
        logger.error({metadata: {deviceId}}, 'User for device not found!');
        throw new NotFoundError({description: 'User for device not found!'});
    }
    const {userId, tenantId} = userAndTenant;
    const tenantShortCode = await getTenantShortCode(tenantId);
    if (!tenantShortCode) {
        logger.error({metadata: {tenantId}}, 'Missing short code for tenant');
        throw new NotFoundError({description: 'Missing short code for tenant'});
    }
    const hasOpenConnections = await hasPubSubConnection(deviceId);
    if (!hasOpenConnections) {
        const subscriptionId = await getChatReadReceiptsSubscriptionId(userId);
        if (subscriptionId) {
            await unWatchReadReceipt(subscriptionId, tenantShortCode, userId);
        } else {
            await unWatchAllChatSubscriptions(tenantShortCode, userId);
        }
    }
}

module.exports = {
    createHandler,
    destroyHandler,
    disconnect,
    authorizeRequest,
    unWatchConnectionReadReceipts,
    createServerAndSocket
};
