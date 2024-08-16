let gateway = null,
    getTenantShortCode = null;

beforeEach(() => {
    jest.mock('../RedisGateway', () => ({
        getRedisHashMap: jest.fn(() => Promise.resolve(JSON.stringify('TEST')))
    }));

    gateway = require('../RedisGateway');
    getTenantShortCode = require('./TenantHelper').getTenantShortCode;
});

afterEach(() => {
    jest.unmock('../RedisGateway');
});

describe('Given we want to work with the tenant helper file', () => {
    describe('when we extract the tenant short code from the tenant id', () => {
        test('then we return the tenant short code', async () => {
            const result = await getTenantShortCode('long-tenant-code-id');

            expect(gateway.getRedisHashMap).toHaveBeenCalledTimes(1);
            expect(result).toEqual('TEST');
        });
    });
});
