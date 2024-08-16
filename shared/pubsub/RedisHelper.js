const {isAsyncGenerator} = require('./utils');
const difference = require('set.prototype.difference');
const {createClient} = require('redis');
const {
    REDIS_CONNECTION_STRING,
    REDIS_COLLECTIONS: {GQLWS_DISCONNECTIONS, GQLWS_COMPLETES},
    GQLWS_SUBSCRIPTIONS_REDIS_TTL_IN_SECS
} = require('../constants');
const {getLogger} = require('../logs/LoggingService');

const logger = getLogger('RedisHelper');
const uri = new URL(REDIS_CONNECTION_STRING);
const options = {
    pingInterval: 5 * 60 * 1000 // Ping Each 5min. https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection#idle-timeout
};
if (uri.protocol === 'rediss:') {
    options.socket = {tls: true};
}
let client = createClient({url: REDIS_CONNECTION_STRING, ...options});

async function connectRedisSubscriptionsClient() {
    logger.debug('Connecting Redis Helper for subscriptions...');
    await client.connect();
}

async function listenForCompletes(cb) {
    try {
        const subscriber = client.duplicate();
        await subscriber.connect();
        await subscriber.subscribe(GQLWS_COMPLETES, (message) => {
            const [connectionId, subscriptionId] = message.split('|');
            cb(connectionId, subscriptionId);
        });

        return async () => {
            logger.debug('Unsubscribing from Redis completes ...');
            await subscriber.unsubscribe(GQLWS_COMPLETES);
            logger.debug('Unsubscribed.');
        };
    } catch (error) {
        logger.error({error});
    }
}

async function listenForDisconnect(cb) {
    try {
        const subscriber = client.duplicate();
        await subscriber.connect();
        await subscriber.subscribe(GQLWS_DISCONNECTIONS, cb);

        return async () => {
            logger.debug('Unsubscribing from Redis disconnects ...');
            await subscriber.unsubscribe(GQLWS_DISCONNECTIONS);
            logger.debug('Unsubscribed.');
        };
    } catch (error) {
        logger.error({error});
    }
}

async function publishDisconnect(connectionId) {
    logger.debug({metadata: {connectionId}}, 'Publishing disconnect via Redis ...');

    try {
        await client.publish(GQLWS_DISCONNECTIONS, connectionId);
        logger.debug({metadata: {connectionId}}, 'Published.');
    } catch (error) {
        logger.error({error, metadata: {connectionId}});
    }
}

async function completeSubscription(connectionId, subscriptionId) {
    logger.debug(
        {metadata: {connectionId, subscriptionId}},
        `Removing ${connectionId} - ${subscriptionId} from Redis because complete ...`
    );
    try {
        const key = `gqlws:${connectionId}`;
        await client
            .multi()
            .sRem(key, subscriptionId)
            .publish(GQLWS_COMPLETES, `${connectionId}|${subscriptionId}`)
            .expire(key, GQLWS_SUBSCRIPTIONS_REDIS_TTL_IN_SECS) //refresh TTL because this is a set
            .exec();
        logger.debug({metadata: {connectionId, subscriptionId}}, 'Removed and advertised.');
    } catch (error) {
        logger.error({error, metadata: {connectionId}});
    }
}

async function persistServerlessContext(
    connectionId,
    {connectionInitReceived, acknowledged, subscriptions, connectionParams, extra}
) {
    let members = [];
    if (connectionInitReceived) {
        members.push('connectionInitReceived');
    }

    if (acknowledged) {
        members.push('acknowledged');
    }

    if (connectionParams) {
        members.push(`cp:${JSON.stringify(connectionParams)}`);
    }

    if (extra) {
        members.push(`extra:${JSON.stringify(extra)}`);
    }

    members = members.concat(Object.keys(subscriptions));

    logger.debug(
        {metadata: {connectionId}},
        `Persisting ${connectionId}: ${members.join(', ')} to Redis...`
    );
    // adds context with known subscriptions for host
    const key = `gqlws:${connectionId}`;

    try {
        await client
            .multi()
            .sAdd(key, members)
            .expire(key, GQLWS_SUBSCRIPTIONS_REDIS_TTL_IN_SECS) //reset TTL since this is a set
            .exec();
        logger.debug({metadata: {connectionId}}, 'Persisted.');
    } catch (error) {
        logger.error({error, metadata: {connectionId}});
    }
}

async function readAndUpdateServerlessContext(connectionId, existingContext = {}) {
    try {
        let persistedMembers = await client.sMembers(`gqlws:${connectionId}`);
        logger.debug(
            {metadata: {connectionId, existingContext}},
            `Loading ${connectionId}: ${persistedMembers.join(', ')}`
        );

        let persistedSet = new Set(persistedMembers);
        let connectionInitReceived = persistedSet.has('connectionInitReceived');
        persistedSet.delete('connectionInitReceived');
        let acknowledged = persistedSet.has('acknowledged');
        persistedSet.delete('acknowledged');

        let cpJson = Array.from(persistedSet.values()).find((value) => value.indexOf('cp:') === 0);
        let connectionParams;
        if (cpJson) {
            cpJson = cpJson.slice(cpJson.indexOf('cp:') + 3);
            connectionParams = JSON.parse(cpJson);
            persistedSet.delete(`cp:${cpJson}`);
        }

        let extraJson = Array.from(persistedSet.values()).find(
            (value) => value.indexOf('extra:') === 0
        );
        let extra;
        if (extraJson) {
            extraJson = extraJson.slice(extraJson.indexOf('extra:') + 6);
            extra = JSON.parse(extraJson);
            persistedSet.delete(`extra:${extraJson}`);
        }

        let existingSubscriptions = new Set(Object.keys(existingContext.subscriptions));
        const subscriptionsToRemove = difference(existingSubscriptions, persistedSet);
        logger.debug(
            {metadata: {connectionId}},
            `Found ${subscriptionsToRemove.size} subscriptions to remove: ${Array.from(
                subscriptionsToRemove.values()
            ).join(', ')}`
        );

        const subscriptionsToAdd = difference(persistedSet, existingSubscriptions);
        logger.debug(
            {metadata: {connectionId}},
            `Found ${subscriptionsToRemove.size} remote subscriptions: ${Array.from(
                subscriptionsToAdd.values()
            ).join(', ')}`
        );

        let persistedContext = {
            connectionInitReceived,
            acknowledged,
            connectionParams,
            extra
        };

        const newContext = {
            ...existingContext,
            ...persistedContext
        };

        if (!persistedContext.extra && existingContext.extra) {
            newContext.extra = existingContext.extra;
        }

        if (!persistedContext.connectionParams && existingContext.connectionParams) {
            newContext.connectionParams = existingContext.connectionParams;
        }

        // These are subscriptions we didn't know about on this host, so record them as remote
        subscriptionsToAdd.forEach((subscriptionId) => {
            newContext.subscriptions[subscriptionId] = {remote: true};
        });

        subscriptionsToRemove.forEach((subscriptionId) => {
            const subscription = existingContext.subscriptions[subscriptionId];
            if (isAsyncGenerator(subscription)) {
                subscription.return(undefined);
            }
            delete existingContext.subscriptions[subscriptionId];
            logger.debug({metadata: {connectionId}}, `Removed subscription ${subscriptionId}.`);
        });

        logger.debug({metadata: {connectionId, newContext}}, 'Returning new context');

        return newContext;
    } catch (error) {
        logger.error({error, metadata: {connectionId}});
    }
}

async function deleteServerlessContext(connectionId) {
    logger.debug({metadata: {connectionId}}, `Destroying context for ${connectionId} ...`);

    try {
        await client.del(`gqlws:${connectionId}`);
        logger.debug({metadata: {connectionId}}, `Destroyed.`);
    } catch (error) {
        logger.error({error, metadata: {connectionId}});
    }
}

module.exports = {
    deleteServerlessContext,
    completeSubscription,
    listenForDisconnect,
    persistServerlessContext,
    publishDisconnect,
    readAndUpdateServerlessContext,
    listenForCompletes,
    connectRedisSubscriptionsClient
};
