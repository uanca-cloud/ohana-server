let makeDhpApiCall = null,
    httpPoolFactory = null;

beforeEach(() => {
    jest.mock('./HttpPoolFactory', () => {
        return {
            getHttpPool: jest.fn(() => ({
                acquire: () => jest.fn(() => Promise.resolve('test')),
                release: () => jest.fn()
            }))
        };
    });

    makeDhpApiCall = require('./DhpHttpGateway').makeDhpApiCall;
    httpPoolFactory = require('./HttpPoolFactory');
});

afterAll(() => {
    jest.unmock('./HttpPoolFactory');
});

describe('Given we want to make http requests to dhp', () => {
    describe('When we make a request using the pool', () => {
        test('then it returns the fetch response', () => {
            expect(makeDhpApiCall('test', '/path', 'POST')).resolves.toEqual('test');
        });

        test('then it throws an error', () => {
            httpPoolFactory.getHttpPool.mockImplementationOnce(() => ({
                acquire: () =>
                    jest.fn(() => {
                        throw new Error();
                    }),
                release: () => jest.fn()
            }));
            expect(makeDhpApiCall('test', '/path', 'POST')).rejects.toThrow();
        });
    });
});
