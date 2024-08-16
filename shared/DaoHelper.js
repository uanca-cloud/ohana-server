const {getDatabasePool} = require('./DatabasePoolFactory'),
    {DB_CONNECTION_POOLS, PG_BATCH_SIZE} = require('./constants'),
    difference = require('lodash.difference'),
    chunk = require('lodash.chunk');

/**
 * Run multiple DAO functions with transaction
 *
 * @param {function} handler
 */
async function runWithTransaction(handler) {
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const client = await pool.acquire();
    let finalResult = null;

    try {
        await client.query('BEGIN;');

        finalResult = await handler(client);

        await client.query('COMMIT;');

        pool.release(client);
    } catch (error) {
        await client.query('ROLLBACK;');
        pool.release(client);
        throw error;
    }
    return finalResult;
}

const areEqualArrays = (first, second) =>
    !(
        difference(first, second).length !== 0 ||
        difference(second, first).length !== 0 ||
        first.length !== second.length
    );

/**
 * Runs a query for batches of items with a max length of `PG_BATCH_SIZE`
 * @param dbClient
 * @param items
 * @param query
 * @param additionalParams
 * @returns {Promise<Awaited<*>[]>}
 */
async function runBatchQuery(dbClient, items, query, additionalParams = []) {
    let batches = [items];

    if (items.length > PG_BATCH_SIZE) {
        batches = chunk(items, PG_BATCH_SIZE);
    }

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return Promise.all(batches.map((batch) => client.query(query, [batch, ...additionalParams])));
}

module.exports = {runWithTransaction, areEqualArrays, runBatchQuery};
