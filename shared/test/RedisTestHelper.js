const {createRedisPool} = require('../RedisPoolFactory.js');

let client;
let pool;

async function getTestClient() {
    if (client) {
        return client;
    }

    client = await pool.acquire();
    return client;
}

async function teardownTestClient() {
    if (client) {
        await pool.release(client);
        client = null;
    }
}

function createTestPool(name = 'default') {
    if (!pool) {
        pool = createRedisPool(name, process.env.REDIS_CONNECTION_STRING);
    }
}

async function teardownTestPool() {
    if (pool) {
        await pool.drain();
        await pool.clear();
        pool = null;
    }
}

module.exports = {
    createTestPool,
    teardownTestClient,
    teardownTestPool,
    getTestClient
};
