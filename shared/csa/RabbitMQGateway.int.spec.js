const constants = require('../constants'),
    queueName = 'ohana.int-test';

let mockPool = null,
    assertMainExchangeAndQueue = null,
    createMockPool = null,
    teardownConnections = null;

beforeEach(async () => {
    constants.RABBITMQ_CONNECTION_STRING_CONSUMER = constants.RMQ_ADMIN_INTEGRATION_RUNNER;

    jest.mock('./DefaultSubscriptionHandler', () => ({
        handler: () => jest.fn()
    }));

    createMockPool = require('../test/RabbitMQIntegrationTestHelper').createMockPool;
    teardownConnections = require('../test/RabbitMQIntegrationTestHelper').teardownConnections;
    assertMainExchangeAndQueue = require('../csa/RabbitMQGateway').assertMainExchangeAndQueue;

    mockPool = createMockPool('infra');

    await assertMainExchangeAndQueue();

    const channel = await mockPool.acquire();
    await channel.assertQueue(queueName, {
        durable: true
    });
    await channel.bindQueue(queueName, constants.RABBITMQ_DEFAULT_EXCHANGE, `#`);
    await mockPool.release(channel);
});

afterEach(async () => {
    jest.unmock('../logs/LoggingService');
    jest.unmock('./DefaultSubscriptionHandler');
});

afterAll(async () => {
    const channel = await mockPool.acquire();
    await channel.deleteQueue(queueName);
    await mockPool.release(channel);

    await teardownConnections();
    await mockPool.drain().then(() => mockPool.clear());
});

describe('Given we want to work with RabbitMQ', () => {
    describe('when we want to assert the main exchange and queue', () => {
        it('then we should have them both created', async () => {
            await assertMainExchangeAndQueue();
            const channel = await mockPool.acquire();
            const exchangeResult = await channel.checkExchange(constants.RABBITMQ_DEFAULT_EXCHANGE);
            const queueResult = await channel.checkQueue(constants.RABBITMQ_DEFAULT_QUEUE);
            await mockPool.release(channel);
            expect(exchangeResult).toBeTruthy();
            expect(queueResult).toBeTruthy();
        });
    });
});
