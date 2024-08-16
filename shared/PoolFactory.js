const genericPool = require('generic-pool'),
    ApplicationError = require('./custom-errors/application-error'),
    {ERROR_CODES, DEFAULT_POOL_ACQUIRE_TIMEOUT_IN_MILLIS} = require('./constants');

const DEFAULT_MIN_POOL_SIZE = 1,
    DEFAULT_MAX_POOL_SIZE = 1;

const pools = new Map();

/**
 * Creates a pool using the generic-pool impl.  This impl use PG clients and exposes a compatibility fn of query
 * to emulate node-pg, but the pools can allow a specific client to be locked and used for transaction management.
 * @param {{create: function, destroy: function}} factory - Object with create and destroy fns to use with the pool.
 * @param {string} name - The name of the new pool
 * @param {{minPoolSize, maxPoolSize, testOnBorrow}} [options] Options for generic pool
 */
function createPool(
    factory,
    name,
    {
        minPoolSize = DEFAULT_MIN_POOL_SIZE,
        maxPoolSize = DEFAULT_MAX_POOL_SIZE,
        testOnBorrow = false
    } = {}
) {
    if (typeof factory.create !== 'function' || typeof factory.destroy !== 'function') {
        throw new ApplicationError(
            ERROR_CODES.RESOLVER_UNKNOWN,
            `factory argument must have both create and destroy fns!`
        );
    }

    let pool = pools.get(name);
    if (pool) {
        // Uncomment when working on this area of code, otherwise pollutes the logs
        //logger.debug(`Pool ${name} already exists!  Using the existing pool.`);
        return pool;
    }

    pool = genericPool.createPool(factory, {
        min: minPoolSize,
        max: maxPoolSize,
        acquireTimeoutMillis: DEFAULT_POOL_ACQUIRE_TIMEOUT_IN_MILLIS,
        testOnBorrow
    });

    pools.set(name, pool);
    return pool;
}

/**
 * Returns the named connection pool
 * @param {string} name - The name of the pool to retrieve
 */
function getPool(name) {
    const pool = pools.get(name);
    if (!pool) {
        throw new ApplicationError(ERROR_CODES.RESOURCE_UNAVAILABLE, `Pool ${name} not found!`);
    }

    return pool;
}

module.exports = {
    createPool,
    getPool
};
