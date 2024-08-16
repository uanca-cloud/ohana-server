const {
        RMQ_ADMIN_INTEGRATION_RUNNER,
        RABBITMQ_FEDERATION_UPSTREAM_PREFIX,
        RABBITMQ_POLICY_PREFIX,
        RABBITMQ_EXCHANGE_PREFIX
    } = require('../constants'),
    {
        fixtureData: {tenant2}
    } = require('../test/fixtures/DhpFixtures');

let mockHttpPool = null,
    mockPool = null,
    createMockPool = null,
    createHttpMockPool = null,
    listAllFederatedTenants = null,
    createFederatedTenantResources = null,
    allocateResources = null,
    assertMainExchangeAndQueue = null,
    teardownConnections = null;

beforeEach(async () => {
    createHttpMockPool = require('../test/RabbitMQIntegrationTestHelper').createHttpMockPool;
    teardownConnections = require('../test/RabbitMQIntegrationTestHelper').teardownConnections;
    listAllFederatedTenants = require('./TenantCsaRmqConfigurationDao').listAllFederatedTenants;
    createFederatedTenantResources =
        require('./TenantCsaRmqConfigurationDao').createFederatedTenantResources;
    allocateResources = require('./TenantCsaRmqResourceAllocationStrategy');
    createMockPool = require('../test/RabbitMQIntegrationTestHelper').createMockPool;
    assertMainExchangeAndQueue = require('../csa/RabbitMQGateway').assertMainExchangeAndQueue;

    mockHttpPool = createHttpMockPool('rmq-api');
    mockPool = createMockPool('infra');
    await assertMainExchangeAndQueue();
});

afterEach(async () => {
    await mockHttpPool.drain().then(() => mockHttpPool.clear());
    await teardownConnections();
    await mockPool.drain().then(() => mockPool.clear());
});

describe('Given we want to test the rmq config helpers', () => {
    afterEach(async () => {
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
    });

    describe('when we want to list all federated tenants', () => {
        it('returns the tenant if it has all prerequisites', async () => {
            await allocateResources(tenant2.shortCode, RMQ_ADMIN_INTEGRATION_RUNNER);
            const response = await listAllFederatedTenants();
            expect(response).toContain(tenant2.shortCode);
        });

        it('returns the list without the tenant', async () => {
            const response = await listAllFederatedTenants();
            expect(response).not.toContain(tenant2.shortCode);
        });
    });

    describe('Given we want to allocate tenant resources', () => {
        it('it throws for missing credentials', async () => {
            await expect(createFederatedTenantResources(tenant2.shortCode)).rejects.toThrow();
        });

        it('it works and the resouces get created', async () => {
            await createFederatedTenantResources(tenant2.shortCode, 'foo', 'bar');
            const response = await listAllFederatedTenants();
            expect(response).toContain(tenant2.shortCode);
        });
    });
});
