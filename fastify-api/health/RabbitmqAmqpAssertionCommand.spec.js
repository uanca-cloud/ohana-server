let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            RABBITMQ_CONNECTION_POOLS: {
                HEALTH: 'health'
            },
            RABBITMQ_DEFAULT_EXCHANGE: ''
        },
        getRabbitMQPool: jest.fn(() => {
            return {
                acquire: jest.fn(() => {
                    return {
                        checkExchange: jest.fn(() => {
                            return {
                                status: 'fulfilled',
                                value: {
                                    isUp: true
                                }
                            };
                        })
                    };
                }),
                release: jest.fn()
            };
        }),
        getLogger: jest.fn(() => {
            return {
                debug: jest.fn(),
                error: jest.fn()
            };
        })
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./RabbitmqAmqpAssertionCommand');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to create a RMQ AMQP connection', () => {
    describe('Given there are no errors', () => {
        test('then the RMQ AMQP pool should return true when the exchange is checked ', async () => {
            await resolver();
            expect(ohanaSharedPackage.getRabbitMQPool).toBeCalledTimes(1);
        });

        test('then the promise should resolve', async () => {
            await expect(resolver()).resolves.not.toThrow();
        });
    });

    describe('Given there are errors', () => {
        describe('Given the checkExchange returns false', () => {
            test('then the promise should reject', async () => {
                ohanaSharedPackage.getRabbitMQPool.mockImplementationOnce(() => {
                    return {
                        acquire: jest.fn(() => {
                            return {
                                checkExchange: jest.fn(() => {
                                    return {
                                        status: 'rejected',
                                        value: {
                                            isUp: false
                                        }
                                    };
                                })
                            };
                        })
                    };
                });

                await expect(resolver()).rejects.toThrow();
            });
        });
    });
});
