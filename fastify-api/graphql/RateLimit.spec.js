let rateLimit = null,
    ohanaSharedPackage = null;
beforeEach(() => {
    rateLimit = require('./RateLimit');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(),
        incrementRedisKey: jest.fn(),
        redisTransaction: jest.fn()
    }));
    ohanaSharedPackage = require('ohana-shared');
});

describe(`When using the rate limit function to limit a user`, () => {
    describe(`when we use the 'fixed' strategy`, () => {
        it('it should throw an error if the rate limit has been exceeded', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => 10);
            await expect(rateLimit.fixed({reqLimit: 9})).rejects.toThrow();
        });
        it(`it should create the rate limit key and set its expiration in a redis transaction`, async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => null);
            await rateLimit.fixed(
                {
                    userId: '123',
                    reqLimit: 9,
                    expireInSec: 60
                },
                'myResolver'
            );
            expect(ohanaSharedPackage.redisTransaction).toHaveBeenCalledWith({
                incr: [`rate_limit_myResolver:123`],
                expire: [`rate_limit_myResolver:123`, 60]
            });
        });
        it(`it should increase the rate limit key`, async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => 7);
            await rateLimit.fixed(
                {
                    userId: '123',
                    reqLimit: 9
                },
                'myResolver'
            );
            expect(ohanaSharedPackage.incrementRedisKey).toHaveBeenCalledWith(
                `rate_limit_myResolver`,
                '123'
            );
        });
    });
});
