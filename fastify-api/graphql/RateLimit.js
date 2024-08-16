const {
    getRedisCollectionData,
    incrementRedisKey,
    redisTransaction,
    TooManyRequestsError
} = require('ohana-shared');

module.exports = {
    /**
     * @description Basic rate limit algorithm, restricts the numbers of requests sent in a fixed interval of time.
     */
    fixed: async ({userId, reqLimit, expireInSec}, fieldName) => {
        const limit = await getRedisCollectionData(`rate_limit_${fieldName}`, userId, {
            getAsJSON: false
        });

        if (limit >= reqLimit) {
            throw new TooManyRequestsError({
                description: `Too many requests, rate limit TTL is ${expireInSec}s`
            });
        }
        !limit
            ? await redisTransaction({
                  incr: [`rate_limit_${fieldName}:${userId}`],
                  expire: [`rate_limit_${fieldName}:${userId}`, expireInSec]
              })
            : await incrementRedisKey(`rate_limit_${fieldName}`, userId);
    }
};
