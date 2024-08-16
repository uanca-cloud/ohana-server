const {
        PG_CONNECTION_STRING,
        DB_CONNECTION_POOLS,
        REDIS_CONNECTION_STRING,
        REDIS_CONNECTION_POOLS,
        RABBITMQ_CONNECTION_POOLS,
        RABBITMQ_DEFAULT_QUEUE,
        CSA_SUPERGRAPH_URL,
        RABBITMQ_RESOURCE_MANAGEMENT_URL,
        RABBITMQ_RESOURCE_MANAGEMENT_USER,
        RABBITMQ_RESOURCE_MANAGEMENT_PASS,
        HTTP_CONNECTION_POOLS,
        CSA_CLIENT_ID,
        CSA_PRODUCT_OID,
        DISABLE_CSA_INTEGRATION,
        ZENITH_QUALIFIED_DOMAIN_NAME,
        RABBITMQ_CONNECTION_STRING_INFRA,
        TENANTS_CHECK_INTERVAL_IN_MILLIS,
        CURRENT_SERVER_VERSION
    } = require('./constants'),
    {createDatabasePool} = require('./DatabasePoolFactory'),
    {createRedisPool} = require('./RedisPoolFactory'),
    {createRabbitMQPool} = require('./csa/RabbitMQPoolFactory'),
    {createHttpPool} = require('./HttpPoolFactory'),
    {
        registerConsumer,
        assertMainExchangeAndQueue,
        cleanupOutdatedExchange
    } = require('./csa/RabbitMQGateway'),
    {refreshTenantIndex} = require('./tenant/TenantCsaCredentialDao'),
    {connectRedisSubscriptionsClient} = require('./pubsub/RedisHelper');

let intervalId;

/**
 * Creates the default connection pool with the database
 */
async function loadDatabase() {
    return createDatabasePool(DB_CONNECTION_POOLS.DEFAULT, PG_CONNECTION_STRING);
}

/**
 * Creates the default connection pool with redis
 */
async function loadRedis() {
    return createRedisPool(REDIS_CONNECTION_POOLS.DEFAULT, REDIS_CONNECTION_STRING);
}

/**
 * Creates the connection pool used for redis pubsub
 */
async function loadRedisSubscriptions() {
    return connectRedisSubscriptionsClient();
}

/**
 * Application bootstrap sequence
 * @param bypassCsa {boolean} - should CSA RMQ and HTTP pools be bypassed when bootstrapping the server?
 * @return {Promise<void>}
 */
async function bootstrap(bypassCsa = true) {
    await loadDatabase();
    await loadRedis();
    if (!bypassCsa) {
        if (!DISABLE_CSA_INTEGRATION) {
            await loadRedisSubscriptions();
            loadRabbitMQ();
            await assertMainExchangeAndQueue();
            await registerConsumer(RABBITMQ_DEFAULT_QUEUE);
            loadCsaHttpPools();
            setupFederatedTenantsLoader();
            // this should only be used for the next release
            await cleanupOutdatedExchange();
        }
        loadDhpHttpPool();
    }
}

/**
 * Application bootstrap for azure functions sequence
 * @param bypassCsa {boolean} - should CSA HTTP pools be bypassed when bootstrapping the server?
 * @return {Promise<void>}
 */
async function bootstrapAzf(bypassCsa = true) {
    await loadDatabase();
    await loadRedis();
    if (!bypassCsa) {
        if (!DISABLE_CSA_INTEGRATION) {
            loadCsaHttpPools();
            setupFederatedTenantsLoader();
        }
        loadDhpHttpPool();
    }
}

async function bootstrapClientLogUpload() {
    await loadRedis();
}

/**
 * Sets up RMQ connection pools for AMQP
 * @returns {void}
 */
function loadRabbitMQ() {
    createRabbitMQPool(RABBITMQ_CONNECTION_POOLS.INFRA, RABBITMQ_CONNECTION_STRING_INFRA);
}

/**
 * Setup HTTP pools for CSA and RMQ HTTP API communication
 */
function loadCsaHttpPools() {
    loadCsaHttpPool();
    loadRabbitMQHttpPool();
}

function loadCsaHttpPool() {
    createHttpPool(HTTP_CONNECTION_POOLS.CSA, {
        url: CSA_SUPERGRAPH_URL,
        defaultHeaders: {
            'Content-Type': 'application/json',
            'X-Client-ID': CSA_CLIENT_ID,
            'apollographql-client-name': CSA_PRODUCT_OID,
            'apollographql-client-version': CURRENT_SERVER_VERSION
        }
    });
}

function loadRabbitMQHttpPool() {
    const token = Buffer.from(
        `${RABBITMQ_RESOURCE_MANAGEMENT_USER}:${RABBITMQ_RESOURCE_MANAGEMENT_PASS}`
    ).toString('base64');

    createHttpPool(HTTP_CONNECTION_POOLS.RMQ_API, {
        url: RABBITMQ_RESOURCE_MANAGEMENT_URL,
        defaultHeaders: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${token}`
        }
    });
}

function loadDhpHttpPool() {
    createHttpPool(HTTP_CONNECTION_POOLS.DHP, {
        defaultHeaders: {'Content-Type': 'text/plain'},
        url: ZENITH_QUALIFIED_DOMAIN_NAME
    });
}

function setupFederatedTenantsLoader() {
    intervalId = setInterval(refreshTenantIndex, TENANTS_CHECK_INTERVAL_IN_MILLIS);
}

function teardownFederatedTenantsLoader() {
    clearInterval(intervalId);
}

module.exports = {
    bootstrap,
    bootstrapClientLogUpload,
    teardownFederatedTenantsLoader,
    bootstrapAzf
};
