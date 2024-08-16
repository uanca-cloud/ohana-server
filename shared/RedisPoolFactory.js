const {createClient} = require('redis'),
    {createPool: genericCreatePool, getPool: genericGetPool} = require('./PoolFactory'),
    {REDIS_DEFAULT_MAX_POOL_SIZE, REDIS_DEFAULT_MIN_POOL_SIZE} = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('RedisPoolFactory');

function generatePoolName(name) {
    return `redis-${name}`;
}

/**
 * Creates a Redis connection pool using the generic-pool impl.  This impl use Redis clients and exposes a compatibility fn of query
 * to emulate node-pg, but the pools can allow a specific client to be locked and used for transaction management.
 * @param {string} name - The name of the new pool
 * @param {string} connectionString Redis connection string
 * @param {number} [minPoolSize] - The minimum size of the created pool.  Optional, uses PG_DEFAULT_MIN_POOL_SIZE
 * @param {number} [maxPoolSize] - The maximum size of the created pool. Optional, uses PG_DEFAULT_MAX_POOL_SIZE
 */
function createRedisPool(name, connectionString, minPoolSize, maxPoolSize) {
    const generatedName = generatePoolName(name);

    const factory = {
        create: async function () {
            const uri = new URL(connectionString);
            const options = {
                pingInterval: 5 * 60 * 1000 // Ping Each 5min. https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection#idle-timeout
            };
            if (uri.protocol === 'rediss:') {
                options.socket = {tls: true};
            }

            const client = createClient({url: connectionString, ...options});

            // we need to listen for these in the case that the Redis becomes unavailable, these
            // unhandled events will be re-thrown by the library up to the process
            const onClientError = (error) => {
                logger.error({error}, 'Unexpected Redis connection error!');
                client.restart = true;
                client.removeListener('error', onClientError);
            };
            client.on('error', onClientError);

            await client.connect();

            return client;
        },
        validate: function (client) {
            return !client.restart;
        },
        flush: function (client) {
            client.flushAll();
        },
        destroy: function (client) {
            return client.disconnect();
        }
    };

    minPoolSize = typeof minPoolSize === 'number' ? minPoolSize : REDIS_DEFAULT_MIN_POOL_SIZE;
    maxPoolSize = typeof maxPoolSize === 'number' ? maxPoolSize : REDIS_DEFAULT_MAX_POOL_SIZE;

    return genericCreatePool(factory, generatedName, {
        minPoolSize,
        maxPoolSize,
        testOnBorrow: true
    });
}
/**
 * Returns the named connection pool
 * @param {string} name - The name of the pool to retrieve
 */
function getRedisPool(name) {
    return genericGetPool(generatePoolName(name));
}

module.exports = {
    createRedisPool,
    getRedisPool
};
