const {
        fixtureData: {tenant2}
    } = require('../test/fixtures/DhpFixtures'),
    {
        RMQ_ADMIN_INTEGRATION_RUNNER,
        REDIS_COLLECTIONS,
        RABBITMQ_FEDERATION_UPSTREAM_PREFIX,
        RABBITMQ_POLICY_PREFIX,
        RABBITMQ_EXCHANGE_PREFIX
    } = require('../constants');

let mockHttpPool = null,
    mockPool = null,
    cacheClient,
    createHttpMockPool = null,
    teardownPool = null,
    createPool = null,
    getClient = null,
    teardownClient = null,
    createRmqMockPool = null,
    allocateResources = null,
    refreshTenantIndex = null,
    csaEnabledForTenant = null,
    getRedisHashMap = null,
    deleteRedisKey = null,
    assertMainExchangeAndQueue = null,
    teardownConnections = null;

beforeEach(async () => {
    jest.mock('../LocalAppConfigGateway', () => {
        return {
            getKeysByGlob: jest.fn()
        };
    });
    jest.mock('../AzureAppConfigGateway', () => {
        return {
            getKeysByGlob: jest.fn()
        };
    });
    jest.mock('../logs/LoggingService', () => {
        return {
            getLogger: jest.fn(() => {
                return {
                    debug: jest.fn(),
                    info: jest.fn(),
                    error: jest.fn()
                };
            })
        };
    });

    createHttpMockPool = require('../test/RabbitMQIntegrationTestHelper').createHttpMockPool;
    teardownConnections = require('../test/RabbitMQIntegrationTestHelper').teardownConnections;
    createPool = require('../test/RedisTestHelper').createTestPool;
    teardownPool = require('../test/RedisTestHelper').teardownTestPool;
    getClient = require('../test/RedisTestHelper').getTestClient;
    teardownClient = require('../test/RedisTestHelper').teardownTestClient;
    allocateResources = require('./TenantCsaRmqResourceAllocationStrategy');
    refreshTenantIndex = require('./TenantCsaCredentialDao').refreshTenantIndex;
    csaEnabledForTenant = require('./TenantCsaCredentialDao').csaEnabledForTenant;
    getRedisHashMap = require('../RedisGateway').getRedisHashMap;
    deleteRedisKey = require('../RedisGateway').deleteRedisKey;
    createRmqMockPool = require('../test/RabbitMQIntegrationTestHelper').createMockPool;
    assertMainExchangeAndQueue = require('../csa/RabbitMQGateway').assertMainExchangeAndQueue;

    mockHttpPool = createHttpMockPool('rmq-api');
    mockPool = createRmqMockPool('infra');

    await assertMainExchangeAndQueue();

    createPool();
    cacheClient = await getClient();
    return cacheClient.flushAll();
});

afterEach(async () => {
    await mockHttpPool.drain().then(() => mockHttpPool.clear());
    await teardownConnections();
    await mockPool.drain().then(() => mockPool.clear());
    teardownClient();
});

afterAll(async () => {
    jest.unmock('../logs/LoggingService');
    teardownPool();
});

describe('Given we want to communicate with operations related to tenant credentials', () => {
    beforeEach(async () => {
        const fetch = await mockHttpPool.acquire();
        await Promise.all([
            fetch(
                'DELETE',
                `parameters/federation-upstream/%2F/${RABBITMQ_FEDERATION_UPSTREAM_PREFIX}`,
                {}
            ),
            fetch('DELETE', `policies/%2F/${RABBITMQ_POLICY_PREFIX}`, {}),
            fetch('DELETE', `exchanges/%2F/${RABBITMQ_EXCHANGE_PREFIX}${tenant2.shortCode}`, {})
        ]);
        await mockHttpPool.release(fetch);
        await deleteRedisKey(REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS);
    });

    describe('when refreshing the tenant index list for redis', () => {
        it('it should contain the available tenants', async () => {
            await allocateResources(tenant2.shortCode, RMQ_ADMIN_INTEGRATION_RUNNER);
            await refreshTenantIndex();
            const tenantPropsJSON = await getRedisHashMap(
                REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS,
                tenant2.shortCode
            );
            expect(tenantPropsJSON).not.toBeUndefined();
        });
    });

    describe('when we check if a tenant has csa enabled', () => {
        it("should return false if it's not in the list", async () => {
            await expect(csaEnabledForTenant(tenant2.shortCode)).resolves.toEqual(undefined);
        });

        it("should return true if it's in the list", async () => {
            await allocateResources(tenant2.shortCode, RMQ_ADMIN_INTEGRATION_RUNNER);
            await refreshTenantIndex();
            await expect(csaEnabledForTenant(tenant2.shortCode)).resolves.toEqual(true);
        });
    });
});
