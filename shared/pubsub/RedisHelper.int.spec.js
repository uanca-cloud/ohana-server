const {
    createTestPool,
    getTestClient,
    teardownTestClient,
    teardownTestPool
} = require('ohana-shared');
const {
    listenForCompletes,
    listenForDisconnect,
    publishDisconnect,
    completeSubscription,
    persistServerlessContext,
    readAndUpdateServerlessContext,
    deleteServerlessContext,
    connectRedisSubscriptionsClient
} = require('./RedisHelper');
let redisClient;

beforeAll(async () => {
    await connectRedisSubscriptionsClient();
});

beforeEach(async () => {
    createTestPool('subscriptions');
    redisClient = await getTestClient();
    return redisClient.flushAll();
});

afterAll(async () => {
    await teardownTestClient();
    await teardownTestPool();
});

describe('Given we want to use the redis subscriptions helper', () => {
    describe('when we listen for completes', () => {
        it('then it receives a message on the subscription', async () => {
            const mockFn = jest.fn();
            const cleanup = await listenForCompletes(mockFn);
            await redisClient.publish('gqlws:completes', `connection_id|subscription_id`);
            await cleanup();
            expect(mockFn).toHaveBeenCalledWith('connection_id', 'subscription_id');
        });
    });

    describe('when we listen for disconnects', () => {
        it('then it receives a message on the subscription', async () => {
            const mockFn = jest.fn();
            const cleanup = await listenForDisconnect(mockFn);
            await redisClient.publish('gqlws:disconnections', `connection_id`);
            await cleanup();
            expect(mockFn).toHaveBeenCalledWith('connection_id', 'gqlws:disconnections');
        });
    });

    describe('when we publish for disconnects', () => {
        it('then it receives the message in redis', async () => {
            const mockFn = jest.fn();
            await redisClient.subscribe('gqlws:disconnections', mockFn);
            await publishDisconnect('connection_id');
            await redisClient.unsubscribe('gqlws:disconnections');
            expect(mockFn).toHaveBeenCalledWith('connection_id', 'gqlws:disconnections');
        });
    });

    describe('when we publish for complete subscription', () => {
        it('then it receives the message in redis', async () => {
            const mockFn = jest.fn();
            await redisClient.subscribe('gqlws:completes', mockFn);
            await completeSubscription('connection_id', 'subscription_id');
            await redisClient.unsubscribe('gqlws:completes');
            expect(mockFn).toHaveBeenCalledWith('connection_id|subscription_id', 'gqlws:completes');
        });
    });

    describe('when we persist the context', () => {
        it('then it is saved in a redis set for connection acked and subscription created with connection params', async () => {
            await persistServerlessContext('1234', {
                connectionInitReceived: true,
                acknowledged: true,
                subscriptions: {uuid: null},
                connectionParams: {authorization: 'Bearer TEST'}
            });
            const setMembers = await redisClient.sMembers('gqlws:1234');
            const jsonStr = JSON.stringify({authorization: 'Bearer TEST'});
            expect(setMembers).toEqual(
                expect.arrayContaining([
                    'connectionInitReceived',
                    'acknowledged',
                    `cp:${jsonStr}`,
                    'uuid'
                ])
            );
        });
    });

    describe('when we retrieve the context', () => {
        it('then we load the set members from redis and merge it with existing context', async () => {
            const jsonStr = JSON.stringify({userId: '123-123'});
            await redisClient.sAdd('gqlws:1234', [
                'connectionInitReceived',
                'acknowledged',
                'uuid',
                `extra:${jsonStr}`
            ]);
            const ctx = await readAndUpdateServerlessContext('1234', {
                connectionInitReceived: true,
                acknowledged: true,
                subscriptions: {uuid: null},
                connectionParams: {authorization: 'Bearer TEST'}
            });

            expect(ctx).toEqual(
                expect.objectContaining({
                    connectionInitReceived: true,
                    acknowledged: true,
                    subscriptions: {uuid: null},
                    connectionParams: {authorization: 'Bearer TEST'},
                    extra: {userId: '123-123'}
                })
            );
        });
    });

    describe('when we delete the redis context', () => {
        it('then the set should be deleted', async () => {
            const jsonStr = JSON.stringify({userId: '123-123'});
            await redisClient.sAdd('gqlws:1234', [
                'connectionInitReceived',
                'acknowledged',
                'uuid',
                `extra:${jsonStr}`
            ]);
            await deleteServerlessContext('1234');
            const setMembers = await redisClient.sMembers('gqlws:1234');
            expect(setMembers).toEqual([]);
        });
    });
});
