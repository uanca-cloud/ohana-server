let _pgStub = null,
    poolFactoryStub = null,
    factory = null;
const {PG_DEFAULT_MIN_POOL_SIZE, PG_DEFAULT_MAX_POOL_SIZE} = require('./constants.js');

beforeEach(() => {
    jest.mock('pg', () => {
        const mockedClient = {
            query: jest.fn(),
            connect: jest.fn(),
            end: jest.fn(),
            on: jest.fn()
        };
        return {Client: jest.fn(() => mockedClient)};
    });
    _pgStub = require('pg');

    jest.mock('./PoolFactory', () => {
        const pool = {
            release: jest.fn(),
            acquire: jest.fn()
        };
        return {createPool: jest.fn(() => pool), getPool: jest.fn(() => pool)};
    });
    poolFactoryStub = require('./PoolFactory');

    factory = require('./DatabasePoolFactory');
});

afterEach(() => {
    jest.unmock('pg');
    jest.unmock('./PoolFactory');
});

describe('Given we want to work with pg pools', () => {
    describe('when we want to create a pool', () => {
        describe('when a pool with a provided name already exists', () => {
            it('then creation should fail with a throw', () => {
                poolFactoryStub.createPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.createDatabasePool('test')).toThrow();
            });
        });

        describe('when providing pool size values', () => {
            it('the pool sizes should be used', () => {
                factory.createDatabasePool('test', '', 2, 3);
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(2);
                expect(maxPoolSize).toBe(3);
            });
        });
        describe('when using default pool size values', () => {
            it('the default pool sizes should be used', () => {
                factory.createDatabasePool('test');
                expect(poolFactoryStub.createPool).toHaveBeenCalled();
                expect(poolFactoryStub.createPool).toHaveBeenCalledTimes(1);

                const {minPoolSize, maxPoolSize} = poolFactoryStub.createPool.mock.calls[0][2];
                expect(minPoolSize).toBe(PG_DEFAULT_MIN_POOL_SIZE);
                expect(maxPoolSize).toBe(PG_DEFAULT_MAX_POOL_SIZE);
            });
        });
    });

    describe('when we want to get a pool', () => {
        describe('when the pool already exists', () => {
            it('then the pool should be found', async () => {
                poolFactoryStub.getPool.mockResolvedValueOnce('pg-test');
                const actual = await factory.getDatabasePool('test');
                expect(poolFactoryStub.getPool).toHaveBeenCalled();
                expect(actual).toBe('pg-test');
            });
        });
        describe('when the pool does not exist', () => {
            it('then it should throw', () => {
                poolFactoryStub.getPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => factory.getPool('test')).toThrow();
            });
        });
    });
});
