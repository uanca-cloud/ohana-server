const {getRedisPool} = require('../RedisPoolFactory'),
    {getInfo} = require('../RedisGateway'),
    {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        REDIS_CONNECTION_POOLS,
        HTTP_CONNECTION_POOLS,
        RABBITMQ_CONNECTION_POOLS,
        DISABLE_CSA_INTEGRATION
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    {getHttpPool} = require('../HttpPoolFactory'),
    {getRabbitMQPool} = require('../csa/RabbitMQPoolFactory');

const logger = getLogger('HealthDao');

function getPoolStats(pool) {
    return {
        spareResourceCapacity: pool.spareResourceCapacity,
        size: pool.size,
        available: pool.available,
        borrowed: pool.borrowed,
        pending: pool.pending,
        max: pool.max,
        min: pool.min
    };
}

/**
 * Shows stats on client pools used by the current Node process
 */
function getAllPoolStats() {
    let result = {};

    const dhpPools = {
        connections: {DHP: HTTP_CONNECTION_POOLS.DHP},
        getPoolFunction: getHttpPool
    };

    const pools = {
        db: {connections: DB_CONNECTION_POOLS, getPoolFunction: getDatabasePool},
        redis: {connections: REDIS_CONNECTION_POOLS, getPoolFunction: getRedisPool},
        dhpHttpPool: dhpPools
    };

    if (!DISABLE_CSA_INTEGRATION) {
        const httpConnectionPoolsForEnabledCSA = Object.keys(HTTP_CONNECTION_POOLS)
            .filter((key) => key !== 'dhp')
            .reduce((obj, key) => {
                obj[key] = HTTP_CONNECTION_POOLS[key];
                return obj;
            }, {});

        pools.rabbitmqHttp = {
            connections: httpConnectionPoolsForEnabledCSA,
            getPoolFunction: getHttpPool
        };

        pools.rabbitmqAmqpPool = {
            connections: RABBITMQ_CONNECTION_POOLS,
            getPoolFunction: getRabbitMQPool
        };
    }

    for (const [key, value] of Object.entries(pools)) {
        result[key] = {};
        Object.keys(value.connections).forEach((currentKey) => {
            const poolName = value.connections[currentKey];
            try {
                const pool = value.getPoolFunction(poolName);
                result[key][poolName] = getPoolStats(pool);
            } catch (error) {
                logger.error({error}, 'Error when getting pool or pool stats');
                result[key.toString()][poolName] = {};
            }
        });
    }

    return result;
}

/**
 * Finds the version number of the latest database migration run against the database
 * @return {Promise<number>}
 */
async function getMigrationVersion() {
    logger.debug('Checking database connection');
    const queryText = `
        SELECT version
        FROM _migrations
        ORDER BY timestamp DESC
        LIMIT 1;
    `;

    let results = null;

    try {
        const pool = getDatabasePool(DB_CONNECTION_POOLS.HEALTH);

        results = await pool.query(queryText);
    } catch (error) {
        logger.error({error}, 'Database connection failure!');

        throw new Error('Database connection failure!');
    }

    if (results.rows.length === 0) {
        logger.error('DB version not found!');
        throw new Error('DB version not found!');
    }

    return results.rows[0].version;
}

/**
 * Returns keyspace info related to the redis host
 * @return {Promise<string>}
 */
async function getKeyspaceInfo() {
    logger.debug('Checking redis connection');
    const pool = getRedisPool(REDIS_CONNECTION_POOLS.HEALTH),
        client = await pool.acquire();

    let keySpaceInfo = null;

    try {
        keySpaceInfo = await getInfo(pool, 'keyspace');
    } catch (error) {
        logger.error({error}, 'Failed to get keyspace info!');
        throw error;
    } finally {
        pool.release(client);
    }

    return keySpaceInfo;
}

function getManifestVersion() {
    let baseDir = process.cwd(),
        manifestPath = `${baseDir}/package.json`,
        manifest = require(manifestPath);

    return manifest.version || 'unknown';
}

module.exports = {
    getAllPoolStats,
    getMigrationVersion,
    getKeyspaceInfo,
    getManifestVersion
};
