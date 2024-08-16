const {
    fixtureData: {user2}
} = require('../test/fixtures/UsersFixtures');

let userDao = null,
    setUserData = null,
    getUserData = null,
    deleteUserData = null,
    updateUserEula = null,
    rehydrateUser = null,
    redisClient = null,
    createPool = null,
    getClient = null,
    teardownPool = null,
    teardownClient = null;

beforeEach(async () => {
    jest.mock('./UserDao', () => ({
        getUserByUserId: jest.fn()
    }));

    createPool = require('../test/RedisTestHelper').createTestPool;
    teardownPool = require('../test/RedisTestHelper').teardownTestPool;
    getClient = require('../test/RedisTestHelper').getTestClient;
    teardownClient = require('../test/RedisTestHelper').teardownTestClient;
    setUserData = require('./UserCacheHelper').setUserData;
    getUserData = require('./UserCacheHelper').getUserData;
    deleteUserData = require('./UserCacheHelper').deleteUserData;
    updateUserEula = require('./UserCacheHelper').updateUserEula;
    rehydrateUser = require('./UserCacheHelper').rehydrateUser;
    userDao = require('./UserDao');

    createPool();
    redisClient = await getClient();
    return redisClient.flushAll();
});

afterEach(async () => {
    teardownClient();
    teardownPool();
});

afterAll(async () => {
    jest.unmock('./UserDao');
    teardownClient();
    teardownPool();
});

describe('Given we want to work with the user cache helper', () => {
    const payload = {content: 'test'};

    describe('when we want to set a user hash', () => {
        test('then it should be found in the cache', async () => {
            await setUserData(1, payload);

            const result = await redisClient.get(`users:1`);

            expect(result).toStrictEqual(JSON.stringify(payload));
        });
    });

    describe('when we want to get a user hash', () => {
        test('then it should be found in the cache', async () => {
            await redisClient.set(`users:1`, JSON.stringify(payload));

            const result = await getUserData(1);

            expect(result).toStrictEqual(payload);
        });
    });

    describe('when we want to delete a user hash', () => {
        test('then it should return true if it was deleted', async () => {
            await redisClient.set(`users:1`, JSON.stringify(payload));
            const result = await deleteUserData(1);
            expect(result).toStrictEqual(true);
        });
    });
    describe('when we want to update the user eula', () => {
        test('then it should update the cache', async () => {
            await redisClient.set(`users:1`, JSON.stringify({acceptedEula: false}));
            await updateUserEula(1, true);
            const result = await getUserData(1);
            expect(result.acceptedEula).toEqual(true);
        });

        test('then it should not alter renewEula if it was never accepted', async () => {
            await redisClient.set(
                `users:1`,
                JSON.stringify({acceptedEula: false, renewEula: false})
            );
            await updateUserEula(1, false);
            const result = await getUserData(1);
            expect(result.renewEula).toEqual(false);
        });

        test('then it should set renewEula as true if it was accepted', async () => {
            await redisClient.set(
                `users:1`,
                JSON.stringify({acceptedEula: false, renewEula: false})
            );
            await updateUserEula(1, true);
            const result = await getUserData(1);
            expect(result.renewEula).toEqual(true);
        });

        test('then it should return renewEula as true if it was previously accepted', async () => {
            await redisClient.set(`users:1`, JSON.stringify({acceptedEula: true, renewEula: true}));
            await updateUserEula(1, false);
            const result = await getUserData(1);
            expect(result.renewEula).toEqual(true);
        });
    });

    describe('when we want to rehydrate the cache', () => {
        test('then it should return if we have results in the cache', async () => {
            await redisClient.set(`users:1`, JSON.stringify(payload));
            await rehydrateUser(1);
            expect(userDao.getUserByUserId).not.toHaveBeenCalled();
        });

        test('then it should query the db if we have a cache miss, but return null if we get no results', async () => {
            userDao.getUserByUserId.mockReturnValue(Promise.resolve(null));
            await expect(rehydrateUser(1)).resolves.toEqual(null);
        });

        test('then it should query the db if we have a cache miss, and write in cache the returned value', async () => {
            userDao.getUserByUserId.mockReturnValue(Promise.resolve(user2));
            await expect(rehydrateUser(user2.userId)).resolves.toEqual(user2);
        });
    });
});
