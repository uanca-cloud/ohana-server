let poolFactoryStub = null,
    factory = null;
const {REDIS_DEFAULT_MIN_POOL_SIZE, REDIS_DEFAULT_MAX_POOL_SIZE} = require('./constants.js');

beforeEach(() => {
    jest.mock('redis', () => ({createClient: jest.fn()}));

    jest.mock('./PoolFactory', () => ({createPool: jest.fn(), getPool: jest.fn()}));
    poolFactoryStub = require('./PoolFactory');

    factory = require('./RedisPoolFactory');
});

afterEach(() => {
    jest.unmock('redis');
    jest.unmock('./PoolFactory');
});

describe('Given we want to work with redis pools', () => {
    describe('when we want to create a pool', () => {
        describe('when a pool with a provided name already exists', () => {
            it('then creation should fail with a throw', () => {
                poolFactoryStub.createPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.createRedisPool('test')).toThrow();
            });
        });
        describe('when providing pool size values', () => {
            it('the pool sizes should be used', () => {
                factory.createRedisPool('test', '', 2, 3);
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(2);
                expect(maxPoolSize).toBe(3);
            });
        });
        describe('when using default pool size values', () => {
            it('the default pool sizes should be used', () => {
                factory.createRedisPool('test');
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(REDIS_DEFAULT_MIN_POOL_SIZE);
                expect(maxPoolSize).toBe(REDIS_DEFAULT_MAX_POOL_SIZE);
            });
        });
    });

    describe('when we want to get a pool', () => {
        describe('when the pool already exists', () => {
            it('then the pool should be found', async () => {
                poolFactoryStub.getPool.mockResolvedValueOnce('redis-test');
                const actual = await factory.getRedisPool('test');
                expect(poolFactoryStub.getPool).toHaveBeenCalled();
                expect(actual).toBe('redis-test');
            });
        });
        describe('when the pool does not exist', () => {
            it('then it should throw', () => {
                poolFactoryStub.getPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.getRedisPool('test')).toThrow();
            });
        });
    });
});
