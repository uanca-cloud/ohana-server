const {Client} = require('pg'),
    {createPool: genericCreatePool, getPool: genericGetPool} = require('./PoolFactory'),
    {
        PG_CONNECTION_TIMEOUT_IN_MILLIS,
        PG_DEFAULT_MIN_POOL_SIZE,
        PG_DEFAULT_MAX_POOL_SIZE
    } = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('DatabasePoolFactory');

function generatePoolName(name) {
    return `db-${name}`;
}

/**
 * Creates a DB connection pool using the generic-pool impl.  This impl use PG clients and exposes a compatibility fn of query
 * to emulate node-pg, but the pools can allow a specific client to be locked and used for transaction management.
 * @param {string} name - The name of the new pool
 * @param {string} connectionString DB connection string
 * @param {number} [minPoolSize] - The minimum size of the created pool.  Optional, uses PG_DEFAULT_MIN_POOL_SIZE
 * @param {number} [maxPoolSize] - The maximum size of the created pool. Optional, uses PG_DEFAULT_MAX_POOL_SIZE
 */
function createDatabasePool(name, connectionString, minPoolSize, maxPoolSize) {
    const generatedName = generatePoolName(name);

    const factory = {
        create: async function () {
            const client = new Client({
                connectionString,
                connectionTimeoutMillis: PG_CONNECTION_TIMEOUT_IN_MILLIS
            });

            // we need to listen for these in the case that the DB becomes unavailable, these
            // unhandled events will be re-thrown by the library up to the process
            client.on('error', (error) => {
                logger.error({error}, 'Unexpected DB connection error!');
                client.restart = true;
            });
            await client.connect();
            return client;
        },
        validate: function (client) {
            return !client.restart;
        },
        destroy: function (client) {
            return client.end();
        }
    };

    minPoolSize = typeof minPoolSize === 'number' ? minPoolSize : PG_DEFAULT_MIN_POOL_SIZE;
    maxPoolSize = typeof maxPoolSize === 'number' ? maxPoolSize : PG_DEFAULT_MAX_POOL_SIZE;

    const pool = genericCreatePool(factory, generatedName, {
        minPoolSize,
        maxPoolSize,
        testOnBorrow: true
    });

    //augment with query fn for things that don't need a guaranteed client for transactions (emulates node-pg behavior)
    pool.query = async function () {
        const client = await pool.acquire();
        let result = null;

        try {
            result = await client.query(...arguments);
            pool.release(client);
        } catch (error) {
            logger.error({error});
            pool.release(client);
            throw error;
        }

        return result;
    };

    return pool;
}

/**
 * Returns the named connection pool
 * @param {string} name - The name of the pool to retrieve
 */
function getDatabasePool(name) {
    return genericGetPool(generatePoolName(name));
}

module.exports = {
    createDatabasePool,
    getDatabasePool
};
