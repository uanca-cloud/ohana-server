let poolFactoryStub = null,
    factory = null,
    amqplib = null;

const {RABBITMQ_MIN_POOL_SIZE, RABBITMQ_MAX_POOL_SIZE} = require('../constants.js');

beforeEach(() => {
    jest.mock('amqplib', () => ({
        connect: jest.fn(() => {
            return {
                createConfirmChannel: jest.fn(() => {
                    return {
                        on: jest.fn()
                    };
                }),
                on: jest.fn()
            };
        })
    }));

    jest.mock('../PoolFactory', () => ({createPool: jest.fn(), getPool: jest.fn()}));
    poolFactoryStub = require('../PoolFactory');

    factory = require('./RabbitMQPoolFactory');
    amqplib = require('amqplib');
});

afterEach(() => {
    jest.unmock('amqplib');
    jest.unmock('../PoolFactory');
});

describe('Given we want to work with rmq pools', () => {
    describe('when we want to create a pool', () => {
        describe('when a pool with a provided name already exists', () => {
            test('then creation should fail with a throw', () => {
                poolFactoryStub.createPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.createRabbitMQPool('test')).toThrow();
            });
        });
        describe('when providing pool size values', () => {
            test('the pool sizes should be used', () => {
                factory.createRabbitMQPool('test', '', 2, 3);
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(2);
                expect(maxPoolSize).toBe(3);
            });
        });
        describe('when using default pool size values', () => {
            test('the default pool sizes should be used', () => {
                factory.createRabbitMQPool('test');
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(RABBITMQ_MIN_POOL_SIZE);
                expect(maxPoolSize).toBe(RABBITMQ_MAX_POOL_SIZE);
            });
        });
    });

    describe('when we want to get a pool', () => {
        describe('when the pool already exists', () => {
            test('then the pool should be found', async () => {
                poolFactoryStub.getPool.mockResolvedValueOnce('rmq-test');
                const actual = await factory.getRabbitMQPool('test');
                expect(poolFactoryStub.getPool).toHaveBeenCalled();
                expect(actual).toBe('rmq-test');
            });
        });
        describe('when the pool does not exist', () => {
            test('then it should throw', () => {
                poolFactoryStub.getPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.getRabbitMQPool('test')).toThrow();
            });
        });
    });

    describe('when we want to create a channel', () => {
        test('then we receive the created channel', () => {
            const result = factory.createChannel('test', 'connection');

            expect(amqplib.connect).toBeCalledWith('connection');
            expect(result).toBeTruthy();
        });
    });
});
