const HttpPoolFactory = require('./HttpPoolFactory');

jest.mock('./PoolFactory', () => ({
    createPool: jest.fn(),
    getPool: jest.fn()
}));

const PoolFactory = require('./PoolFactory');

afterEach(() => {
    jest.resetAllMocks();
});

describe('Given we want to work with HTTP pools', () => {
    describe('when we want to create a pool', () => {
        describe('when a pool with a provided name already exists', () => {
            test('then creation should fail with a throw', () => {
                PoolFactory.createPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => HttpPoolFactory.createHttpPool('test')).toThrow();
            });
        });
        describe('when the content-type header is missing', () => {
            test('then it should throw', () => {
                PoolFactory.createPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() =>
                    HttpPoolFactory.createHttpPool('test', {
                        url: 'http://localhost',
                        defaultHeaders: {'test-header': 'test'}
                    })
                ).toThrow();
            });
        });
        describe('when providing pool size values', () => {
            test('the pool sizes should be used', () => {
                HttpPoolFactory.createHttpPool('test', {}, 2, 3);
                expect(PoolFactory.createPool).toHaveBeenCalledWith(
                    expect.objectContaining({
                        create: expect.anything(),
                        validate: expect.anything(),
                        destroy: expect.anything()
                    }),
                    'http-test',
                    expect.objectContaining({maxPoolSize: 3, minPoolSize: 2})
                );
            });
        });
        describe('when using default pool size values', () => {
            test('the default pool sizes should be used', () => {
                HttpPoolFactory.createHttpPool('test');
                expect(PoolFactory.createPool).toHaveBeenCalled();
                expect(PoolFactory.createPool).toHaveBeenCalledWith(
                    expect.objectContaining({
                        create: expect.anything(),
                        validate: expect.anything(),
                        destroy: expect.anything()
                    }),
                    'http-test',
                    expect.objectContaining({maxPoolSize: 1, minPoolSize: 1})
                );
            });
        });
    });

    describe('when we want to get a pool', () => {
        describe('when the pool already exists', () => {
            test('then the pool should be found', async () => {
                PoolFactory.getPool.mockResolvedValueOnce('http-test');
                const actual = await HttpPoolFactory.getHttpPool('test');
                expect(PoolFactory.getPool).toHaveBeenCalled();
                expect(actual).toBe('http-test');
            });
        });
        describe('when the pool does not exist', () => {
            test('then it should throw', () => {
                PoolFactory.getPool.mockImplementationOnce(() => {
                    throw new Error();
                });
                expect(() => HttpPoolFactory.getHttpPool('test')).toThrow();
            });
        });
    });
});
