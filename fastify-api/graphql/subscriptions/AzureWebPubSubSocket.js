const {GRAPHQL_TRANSPORT_WS_PROTOCOL, MessageType, stringifyMessage} = require('graphql-ws');
const {
    getLogger,
    sendToConnection,
    CONSTANTS: {WEB_PUBSUB_PONG_TIMEOUT_IN_MILLIS, WEB_PUBSUB_PING_INTERVAL_IN_MILLIS}
} = require('ohana-shared');

const logger = getLogger('AzureWebPubSubSocket');

async function sendPayload(connectionId, data) {
    logger.debug({metadata: {connectionId}}, `Socket sending message for ${connectionId} ...`);
    await sendToConnection(connectionId, data);
    logger.debug({metadata: {connectionId}}, 'Message sent.');
}

async function createSocket(emitter, connectionId, enablePing) {
    let pinger, pongWait;

    const socket = {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL, // will be validated, don't forget
        send: async (data) => {
            return sendPayload(connectionId, data);
        },
        close: async (code, reason) => {
            logger.debug({metadata: {connectionId}}, `Socket close for ${connectionId} ...`);
            clearTimeout(pongWait);
            clearInterval(pinger);

            emitter.emit('close', code, reason);
        },
        onMessage: async (cb) => {
            //delegates to the eventemitter since messages come in via the WebPubSubEventHandler but need to be processed by the callback from graphql-ws
            emitter.on('message', async (data) => {
                try {
                    logger.debug(
                        {metadata: {connectionId, data}},
                        `Socket received message for ${connectionId}`
                    );
                    await cb(data);
                } catch (err) {
                    emitter.emit('close', 1011, err.message);
                }
            });
        }
    };

    if (enablePing) {
        // eslint-disable-next-line no-inner-declarations
        async function ping() {
            logger.debug({metadata: {connectionId}}, `Socket ping.`);

            // send the subprotocol level ping message
            await sendPayload(connectionId, stringifyMessage({type: MessageType.Ping}));

            // wait for the pong for 6 seconds and then terminate
            pongWait = setTimeout(() => {
                clearInterval(pinger);
                emitter.emit('close', 1011, 'Pong timeout');
            }, WEB_PUBSUB_PONG_TIMEOUT_IN_MILLIS);
        }

        // ping the client on an interval every 12 seconds
        pinger = setInterval(ping, WEB_PUBSUB_PING_INTERVAL_IN_MILLIS);

        socket.onPong = (_payload) => {
            logger.debug({metadata: {connectionId}}, `Socket pong.`);
            clearTimeout(pongWait);
        };
    }

    return socket;
}

module.exports = createSocket;
