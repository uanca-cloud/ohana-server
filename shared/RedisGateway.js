const {getLogger} = require('./logs/LoggingService'),
    {REDIS_CONNECTION_POOLS} = require('./constants'),
    {getRedisPool} = require('./RedisPoolFactory');

const logger = getLogger('RedisGateway');

async function incrementRedisKey(collectionKey, index) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug('Incrementing redis key...');
    try {
        const response = await redisClient.incr(`${collectionKey}:${index}`);
        logger.info({metadata: {duration: Date.now() - startTime}}, 'Increment command completed');
        return response;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
}
/**
 * @description Create and execute a redis transaction with multiple actions as parameters
 */
async function redisTransaction(operations) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug(
        {metadata: {operations: Object.keys(operations)}},
        'Running transaction with operations'
    );
    try {
        const transaction = await redisClient.multi.call(redisClient);
        for (const [operation, params] of Object.entries(operations)) {
            transaction[operation](...params);
        }
        const response = await transaction.exec();
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Redis transaction command completed'
        );
        return response;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
}

async function setRedisCollectionData(collectionKey, redisTTL, index, payload) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug('Setting information in redis...');
    try {
        await redisClient.setEx(`${collectionKey}:${index}`, redisTTL, JSON.stringify(payload));
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Setting collection data command completed'
        );
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
}

async function getRedisCollectionData(collectionKey, index, {getAsJSON = true} = {}) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug('Getting information from redis...');
    try {
        const result = await redisClient.get(`${collectionKey}:${index}`);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Getting collection data command completed'
        );
        return getAsJSON ? JSON.parse(result) : result;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function delRedisCollectionData(collectionKey, index) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug('Deleting information from redis...');
    try {
        await redisClient.del(`${collectionKey}:${index}`);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Deleting collection data command completed'
        );
        return true;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function setRedisHashMap(hashMap, id, payload) {
    const startTime = Date.now();
    logger.debug('Setting redis hash...');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        await redisClient.hSet(hashMap, id, JSON.stringify(payload));
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Setting hash data command completed'
        );
        return true;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function getAllRedisHashes(hashMap) {
    const startTime = Date.now();
    logger.debug('Get all redis hash...');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        const response = await redisClient.hGetAll(hashMap);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Getting all hash values command completed'
        );
        return response;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function deleteRedisHashMap(hashMap, keys) {
    const startTime = Date.now();
    logger.debug('Deleting redis hash');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        await redisClient.hDel(hashMap, ...keys);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Deleting hash keys command completed'
        );
        return true;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
}

async function getRedisHashMap(hashMap, key) {
    const startTime = Date.now();
    logger.debug('Retrieving redis hash key pair');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        const response = await redisClient.hGet(hashMap, key);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Getting hash for key command completed'
        );
        return response;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function checkIfRedisHashExists(hashMap, key) {
    const startTime = Date.now();
    logger.debug('Checking redis hash key pair exists');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        const result = await redisClient.hExists(hashMap, key);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Checking if key exists in hash command completed'
        );
        return !!result;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

async function updateExpiration(collectionKey, redisTTL, index) {
    const startTime = Date.now();
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    logger.debug('Update redis session expiration date');
    try {
        await redisClient.expire(`${collectionKey}:${index}`, redisTTL);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Updating TTL command completed'
        );
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
}

async function getInfo(redisPool, collectionKey) {
    const startTime = Date.now();
    const redisClient = await redisPool.acquire();

    let result = null;
    logger.debug('Getting redis client information');
    try {
        result = await redisClient.info(collectionKey);
        logger.info({metadata: {duration: Date.now() - startTime}}, 'Info command completed');
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }

    return result;
}

async function deleteRedisKey(key) {
    const startTime = Date.now();
    logger.debug('Removing redis key...');
    const redisPool = getRedisPool(REDIS_CONNECTION_POOLS.DEFAULT);
    const redisClient = await redisPool.acquire();
    try {
        await redisClient.del(key);
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'Deleting key command completed'
        );
        return true;
    } catch (error) {
        logger.error({error, metadata: {duration: Date.now() - startTime}});
    } finally {
        redisPool.release(redisClient);
    }
    return null;
}

module.exports = {
    setRedisCollectionData,
    getRedisCollectionData,
    delRedisCollectionData,
    setRedisHashMap,
    deleteRedisHashMap,
    getRedisHashMap,
    checkIfRedisHashExists,
    getAllRedisHashes,
    updateExpiration,
    incrementRedisKey,
    redisTransaction,
    getInfo,
    deleteRedisKey
};
