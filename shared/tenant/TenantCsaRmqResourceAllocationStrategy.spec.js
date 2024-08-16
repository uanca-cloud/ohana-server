const allocateResources = require('./TenantCsaRmqResourceAllocationStrategy'),
    {
        fixtureData: {tenant1}
    } = require('../test/fixtures/DhpFixtures');

jest.mock('../csa/RabbitMQHttpApiGateway', () => {
    return {
        hasPolicy: jest.fn(),
        createPolicy: jest.fn(),
        hasFederationUpstream: jest.fn(),
        createFederationUpstream: jest.fn(),
        hasExchange: jest.fn(),
        createExchange: jest.fn(),
        hasExchangeBinding: jest.fn(),
        createExchangeBinding: jest.fn()
    };
});

const rmqHttpGateway = require('../csa/RabbitMQHttpApiGateway'),
    connectionString = 'amqp://test:test';

afterAll(() => {
    jest.unmock('../csa/RabbitMQHttpApiGateway');
});

describe('Given we want to allocate tenant resources in rmq', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('when we check for federation upstream', () => {
        test("then it should be created if doesn't exist", async () => {
            rmqHttpGateway.hasFederationUpstream.mockResolvedValueOnce(false);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createFederationUpstream).toHaveBeenCalled();
        });

        test('then it should not call the create function if it exists', async () => {
            rmqHttpGateway.hasFederationUpstream.mockResolvedValueOnce(true);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createFederationUpstream).not.toHaveBeenCalled();
        });
    });

    describe('when we check for federation policy', () => {
        test("then it should be created if doesn't exist", async () => {
            rmqHttpGateway.hasPolicy.mockResolvedValueOnce(false);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createPolicy).toHaveBeenCalled();
        });

        test('then it should not call the create function if it exists', async () => {
            rmqHttpGateway.hasPolicy.mockResolvedValueOnce(true);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createPolicy).not.toHaveBeenCalled();
        });
    });

    describe('when we check for tenant exchange', () => {
        test("then it should be created if doesn't exist", async () => {
            rmqHttpGateway.hasExchange.mockResolvedValueOnce(false);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createExchange).toHaveBeenCalled();
        });

        test('then it should not call the create function if it exists', async () => {
            rmqHttpGateway.hasExchange.mockResolvedValueOnce(true);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createExchange).not.toHaveBeenCalled();
        });
    });

    describe('when we check for exchange binding', () => {
        test("then it should be created if doesn't exist", async () => {
            rmqHttpGateway.hasExchangeBinding.mockResolvedValueOnce(false);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createExchangeBinding).toHaveBeenCalled();
        });

        test('then it should not call the create function if it exists', async () => {
            rmqHttpGateway.hasExchangeBinding.mockResolvedValueOnce(true);
            await allocateResources(tenant1.shortCode, connectionString);
            expect(rmqHttpGateway.createExchangeBinding).not.toHaveBeenCalled();
        });
    });
});
