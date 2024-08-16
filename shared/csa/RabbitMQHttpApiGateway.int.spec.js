const {
        fixtureData: {tenant2}
    } = require('../test/fixtures/DhpFixtures'),
    {
        RABBITMQ_DEFAULT_EXCHANGE,
        RABBITMQ_DEFAULT_QUEUE,
        RMQ_ADMIN_INTEGRATION_RUNNER,
        RABBITMQ_POLICY_PREFIX,
        RABBITMQ_FEDERATION_UPSTREAM_PREFIX
    } = require('../constants'),
    routingKey = '#',
    federationUpstream = `${RABBITMQ_FEDERATION_UPSTREAM_PREFIX}${tenant2.shortCode}`,
    policy = `${RABBITMQ_POLICY_PREFIX}${tenant2.shortCode}`;

let mockPool = null,
    mockHttpPool = null,
    makeHttpAdminApiRequest = null,
    listExchanges = null,
    createExchange = null,
    hasExchange = null,
    listBindings = null,
    hasExchangeBinding = null,
    createExchangeBinding = null,
    hasFederationUpstream = null,
    createFederationUpstream = null,
    listFederatedUpstreams = null,
    hasPolicy = null,
    createPolicy = null,
    listPolicies = null,
    createHttpMockPool = null,
    createMockPool = null,
    assertMainExchangeAndQueue = null,
    teardownConnections = null;

beforeEach(async () => {
    jest.mock('../logs/LoggingService', () => {
        return {
            getLogger: jest.fn(() => ({
                debug: jest.fn(),
                info: jest.fn(),
                error: jest.fn()
            }))
        };
    });

    jest.mock('../pubsub/ChatUpdatePublisher');

    makeHttpAdminApiRequest = require('./RabbitMQHttpApiGateway').makeHttpAdminApiRequest;
    listExchanges = require('./RabbitMQHttpApiGateway').listExchanges;
    createExchange = require('./RabbitMQHttpApiGateway').createExchange;
    hasExchange = require('./RabbitMQHttpApiGateway').hasExchange;
    listBindings = require('./RabbitMQHttpApiGateway').listBindings;
    hasExchangeBinding = require('./RabbitMQHttpApiGateway').hasExchangeBinding;
    createExchangeBinding = require('./RabbitMQHttpApiGateway').createExchangeBinding;
    hasFederationUpstream = require('./RabbitMQHttpApiGateway').hasFederationUpstream;
    createFederationUpstream = require('./RabbitMQHttpApiGateway').createFederationUpstream;
    listFederatedUpstreams = require('./RabbitMQHttpApiGateway').listFederatedUpstreams;
    hasPolicy = require('./RabbitMQHttpApiGateway').hasPolicy;
    createPolicy = require('./RabbitMQHttpApiGateway').createPolicy;
    listPolicies = require('./RabbitMQHttpApiGateway').listPolicies;
    createHttpMockPool = require('../test/RabbitMQIntegrationTestHelper').createHttpMockPool;
    createMockPool = require('../test/RabbitMQIntegrationTestHelper').createMockPool;
    teardownConnections = require('../test/RabbitMQIntegrationTestHelper').teardownConnections;
    assertMainExchangeAndQueue = require('./RabbitMQGateway').assertMainExchangeAndQueue;

    mockHttpPool = createHttpMockPool('rmq-api');
    mockPool = createMockPool('infra');
    await assertMainExchangeAndQueue();
});

afterEach(async () => {
    jest.unmock('../logs/LoggingService');
    jest.unmock('../pubsub/ChatUpdatePublisher');
    await mockHttpPool.drain().then(() => mockHttpPool.clear());
    await teardownConnections();
    await mockPool.drain().then(() => mockPool.clear());
});

describe('Given we want to work with the RMQ HTTP API', () => {
    beforeEach(async () => {
        const fetch = await mockHttpPool.acquire();
        await fetch('DELETE', `exchanges/%2F/${tenant2.shortCode}`, {});
        await mockHttpPool.release(fetch);
    });

    describe('when we want to test sending requests to rmq api', () => {
        it('it throws for faulty props', async () => {
            await expect(
                makeHttpAdminApiRequest({method: 'GET', path: 'overviewss'})
            ).rejects.toThrow();
        });

        it('it works and returns the api response', async () => {
            await expect(
                makeHttpAdminApiRequest({method: 'GET', path: 'overview'})
            ).resolves.toBeTruthy();
        });
    });

    describe('when we want to retrieve existing exchanges', () => {
        it('returns an array containing at least the main exchange', async () => {
            const result = await listExchanges();
            expect(result).toContain(RABBITMQ_DEFAULT_EXCHANGE);
        });

        it('returns an array containing the tenant exchange', async () => {
            await createExchange(tenant2.shortCode);
            const result = await listExchanges();
            expect(result).toContain(tenant2.shortCode);
        });
    });

    describe('when we want to check for exchange existence', () => {
        it('returns false if the exchange does not exist', async () => {
            const result = await hasExchange(tenant2.shortCode);
            expect(result).toEqual(false);
        });

        it('returns true if the exchange exists', async () => {
            await createExchange(tenant2.shortCode);
            const result = await hasExchange(tenant2.shortCode);
            expect(result).toEqual(true);
        });

        it('throws if no name is passed', async () => {
            await expect(hasExchange()).rejects.toThrow();
        });
    });

    describe('when we want to retrieve the list of bindings', () => {
        it('returns the list including the main queue and exchange binding', async () => {
            const result = await listBindings();
            expect(
                result.find((binding) => binding.destination === RABBITMQ_DEFAULT_QUEUE)
            ).not.toBe(undefined);
        });
    });

    describe('when we want to check if a binding exists', () => {
        it("returns false if it doesn't exist", async () => {
            const result = await hasExchangeBinding(
                RABBITMQ_DEFAULT_EXCHANGE,
                tenant2.shortCode,
                routingKey
            );
            expect(result).toBe(false);
        });

        describe('when the binding exists', () => {
            afterEach(async () => {
                const fetch = await mockHttpPool.acquire();
                await fetch(
                    'DELETE',
                    `bindings/%2F/e/${tenant2.shortCode}/e/${RABBITMQ_DEFAULT_EXCHANGE}`,
                    {}
                );
                await mockHttpPool.release(fetch);
            });

            it('returns true if it exists', async () => {
                await createExchange(tenant2.shortCode);
                await createExchangeBinding(
                    RABBITMQ_DEFAULT_EXCHANGE,
                    tenant2.shortCode,
                    routingKey
                );
                const result = await hasExchangeBinding(
                    RABBITMQ_DEFAULT_EXCHANGE,
                    tenant2.shortCode,
                    routingKey
                );
                expect(result).toBe(true);
            });
        });

        describe('when exchange parameters are missing', () => {
            it('should throw', async () => {
                await expect(hasExchangeBinding()).rejects.toThrow();
            });
        });
    });

    describe('when working with the federated plugin', () => {
        beforeEach(async () => {
            const fetch = await mockHttpPool.acquire();
            await Promise.all([
                fetch('DELETE', `parameters/federation-upstream/%2F/${federationUpstream}`, {}),
                fetch('DELETE', `policies/%2F/${policy}`, {})
            ]);
            await mockHttpPool.release(fetch);
        });

        describe('when checking if the federation upstream exists', () => {
            it("return false if it doesn't exist", async () => {
                const result = await hasFederationUpstream(federationUpstream);
                expect(result).toBe(false);
            });

            it('return true if it exists', async () => {
                await createExchange(tenant2.shortCode);
                await createFederationUpstream(
                    federationUpstream,
                    tenant2.shortCode,
                    RMQ_ADMIN_INTEGRATION_RUNNER
                );
                const result = await hasFederationUpstream(federationUpstream);
                expect(result).toBe(true);
            });
        });

        describe('when listing all the federation upstreams', () => {
            it('contains the federation upstream for the exchange', async () => {
                await createExchange(tenant2.shortCode);
                await createFederationUpstream(
                    federationUpstream,
                    tenant2.shortCode,
                    RMQ_ADMIN_INTEGRATION_RUNNER
                );
                const result = await listFederatedUpstreams();
                expect(result.find((upstream) => upstream.name === federationUpstream)).not.toBe(
                    undefined
                );
            });
        });

        describe('when checking if the policy exists', () => {
            it("return false if it doesn't exist", async () => {
                const result = await hasPolicy(policy, federationUpstream);
                expect(result).toBe(false);
            });

            it('return true if it exists', async () => {
                await createExchange(tenant2.shortCode);
                await createFederationUpstream(
                    federationUpstream,
                    tenant2.shortCode,
                    RMQ_ADMIN_INTEGRATION_RUNNER
                );
                await createPolicy(policy, '#', federationUpstream);
                const result = await hasPolicy(policy, federationUpstream);
                expect(result).toBe(true);
            });
        });

        describe('when listing all the policies', () => {
            it('contains the policy for the exchange', async () => {
                await createExchange(tenant2.shortCode);
                await createFederationUpstream(
                    federationUpstream,
                    tenant2.shortCode,
                    RMQ_ADMIN_INTEGRATION_RUNNER
                );
                await createPolicy(policy, '#', federationUpstream);

                const result = await listPolicies();
                expect(result.find((rmqPolicy) => rmqPolicy.name === policy)).not.toBe(undefined);
            });
        });
    });
});
