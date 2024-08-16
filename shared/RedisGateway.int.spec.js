const {
    createTestPool,
    getTestClient,
    teardownTestClient,
    teardownTestPool
} = require('./test/RedisTestHelper');
let redisClient;

beforeEach(async () => {
    createTestPool();
    redisClient = await getTestClient();
    return redisClient.flushAll();
});

afterAll(async () => {
    await teardownTestClient();
    await teardownTestPool();
});

describe('Given we want to work with the redis gateway', () => {
    const payload = {content: 'test'};

    describe('when we create a key', () => {
        const {setRedisCollectionData} = require('./RedisGateway');
        test('it should create the key', async () => {
            await setRedisCollectionData('1', 10, '123', payload);
            const result = await redisClient.get(`1:123`);
            expect(result).toBe(JSON.stringify(payload));
        });
    });
    describe('when we want to get a key', () => {
        const {getRedisCollectionData} = require('./RedisGateway');
        test('it should return the key', async () => {
            await redisClient.set('2:123', JSON.stringify(payload));
            expect(await getRedisCollectionData('2', '123')).toStrictEqual(payload);
        });
        test(`it should return null if the key doesn't exist`, async () => {
            expect(await getRedisCollectionData('2', '124')).toBe(null);
        });
    });
    describe('when we want to delete a key', () => {
        const {delRedisCollectionData} = require('./RedisGateway');
        test('it should return true if the key was successfully deleted', async () => {
            await redisClient.set('3:123', JSON.stringify(payload));
            expect(await delRedisCollectionData('3', '123')).toBe(true);
        });
    });
    describe('when we want to create a hash map', () => {
        const {setRedisHashMap} = require('./RedisGateway');
        test('it should return true if the hash map was successfully created', async () => {
            expect(await setRedisHashMap('testMap', '123', payload)).toBe(true);
            const result = await redisClient.hGet('testMap', '123');
            expect(result).toBe(JSON.stringify(payload));
        });
    });
    describe('when we want to get a hash map', () => {
        const {getRedisHashMap} = require('./RedisGateway');
        test('it should return the payload if the hash map exists', async () => {
            await redisClient.hSet('testMap', '124', JSON.stringify(payload));
            expect(await getRedisHashMap('testMap', '124')).toBe(JSON.stringify(payload));
        });
        test('it should return null if the hash map does not exist', async () => {
            expect(await getRedisHashMap('testMap', '125')).toBe(null);
        });
    });
    describe('when we want to delete a hash map', () => {
        const {deleteRedisHashMap} = require('./RedisGateway');
        test('it should return true if the hash map was deleted successfully', async () => {
            await redisClient.hSet('testMap', '124', JSON.stringify(payload));
            expect(await deleteRedisHashMap('testMap', '124')).toBe(true);
        });
    });

    describe('when we want to get all hash maps', () => {
        const {getAllRedisHashes} = require('./RedisGateway');
        test('it should return all existing hash maps', async () => {
            const allHashMaps = await redisClient.hGetAll('testMap');
            expect(await getAllRedisHashes('testMap')).toStrictEqual(allHashMaps);
        });
    });
    describe('when we want to check if a hash map exists', () => {
        const {checkIfRedisHashExists} = require('./RedisGateway');
        test('it should return true if it exists or false otherwise', async () => {
            const exists = await redisClient.hExists('testMap', '124');
            const notExists = await redisClient.hExists('testMap', '999');
            expect(await checkIfRedisHashExists('testMap', '124')).toBe(!!exists);
            expect(await checkIfRedisHashExists('testMap', '999')).toBe(!!notExists);
        });
    });
    describe('when we want to set the expiration time on a given key', () => {
        const {updateExpiration} = require('./RedisGateway');
        test(`it should update the key's expiration time`, async () => {
            const redisTTL = 10;
            await updateExpiration('1:123', redisTTL);
            const expirationTimeResult = await redisClient.ttl('1:123');

            expect(expirationTimeResult).toBeLessThanOrEqual(redisTTL);
        });
    });
    describe('when we want to increase the value of a given key', () => {
        const {incrementRedisKey} = require('./RedisGateway');
        test(`it should increase the key's value`, async () => {
            expect(await incrementRedisKey('incr', 'key')).toBe(1);
        });
    });
    describe(`when we want to run a transaction`, () => {
        const {redisTransaction} = require('./RedisGateway');
        test(`it should run the transaction with it's given operations`, async () => {
            expect(
                await redisTransaction({
                    incr: [`transactionIncr`],
                    expire: [`transactionIncr`, 60]
                })
            ).toStrictEqual([1, true]);
        });
    });
    describe(`when we want to delete a key`, () => {
        const {deleteRedisKey} = require('./RedisGateway');
        test(`it should delete the key successfully`, async () => {
            await redisClient.hSet('testMap', '124', JSON.stringify(payload));
            expect(await deleteRedisKey('testMap')).toBe(true);
        });
    });
});
