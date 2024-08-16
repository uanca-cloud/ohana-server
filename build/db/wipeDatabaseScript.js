const {Client} = require('pg');

const {
    environment: {PG_ADMIN_USERNAME, PG_ADMIN_PASSWORD, PG_DB}
} = require('../../scripts/constants');

async function runSqlTransaction(callback) {
    const connectionString = `postgres://${PG_ADMIN_USERNAME}:${PG_ADMIN_PASSWORD}@localhost:5432/${PG_DB}`;

    const client = new Client({connectionString});
    client.on('error', (error) => {
        console.log(`Unexpected DB connection error! ${error.message}`);
    });

    await client.connect();

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

async function createWipeDatabaseQueries() {
    let queriesToBeRun = [];
    try {
        let result = null;

        await runSqlTransaction(async (client) => {
            let sql = `SELECT 'DROP VIEW IF EXISTS ' || table_name || ';'
                            FROM information_schema.views
                            WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_name !~ '^pg_'`;
            result = await client.query(sql);

            queriesToBeRun = queriesToBeRun.concat(result.rows);

            sql = `SELECT 'ALTER TABLE IF EXISTS ' || table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_name || ' CASCADE;'
                    FROM information_schema.constraint_table_usage;`;
            result = await client.query(sql);
            queriesToBeRun = queriesToBeRun.concat(result.rows);

            sql = `SELECT 'DROP TABLE IF EXISTS ' || query.tablename || ';'
                            FROM (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename<>'_migrations') AS query;`;
            result = await client.query(sql);
            queriesToBeRun = queriesToBeRun.concat(result.rows);

            queriesToBeRun = queriesToBeRun.map((row) => {
                return row['?column?'];
            });
        });
    } catch (error) {
        console.error(`DELETE QUERIES failure: ${error}`);
    }

    return queriesToBeRun;
}

module.exports = createWipeDatabaseQueries;
