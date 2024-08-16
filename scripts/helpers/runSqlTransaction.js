const createDbConnection = require('./createDbConnection');

async function runSqlTransaction(callback) {
    const client = await createDbConnection();

    try {
        client.query('BEGIN;');
        await callback(client);
        await client.query('COMMIT;');
    } catch (error) {
        console.log(error);
        await client.query('ROLLBACK;');
        throw error;
    } finally {
        await client.end();
    }
}

module.exports = runSqlTransaction;
