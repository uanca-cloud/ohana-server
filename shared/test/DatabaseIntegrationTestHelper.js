const {createDatabasePool, getDatabasePool} = require('../DatabasePoolFactory'),
    {PG_ADMIN_INTEGRATION_RUNNER} = require('../constants');

/**
 * Loads minimal server configuration needed to run integration tests
 */
function bootstrapTest() {
    let pool = null;
    try {
        pool = getDatabasePool('default');
    } catch (error) {
        pool = createDatabasePool('default', PG_ADMIN_INTEGRATION_RUNNER, 1, 1);
    }

    return pool;
}

/**
 * Truncates the given tables in the database
 * @param pool - A database client instance or pool
 * @param {Array<string>} tables - The tables to truncate
 * @returns {Promise<[*]>}
 */
async function truncateTables(pool, tables) {
    //Postgres doesn't support parameterization of table names so we have to concatenate unsafely
    return Promise.all(tables.map((table) => pool.query(`TRUNCATE ${table} CASCADE;`)));
}

module.exports = {
    bootstrapTest,
    truncateTables
};
