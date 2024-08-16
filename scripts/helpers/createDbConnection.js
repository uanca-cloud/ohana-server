const {Client} = require('pg');

const {
    environment: {PG_ADMIN_USERNAME, PG_ADMIN_PASSWORD, PG_DB}
} = require('../constants');

async function createDbConnection(overridingDatabaseName) {
    const connectionString = `postgres://${PG_ADMIN_USERNAME}:${PG_ADMIN_PASSWORD}@localhost:5432/${
        overridingDatabaseName || PG_DB
    }`;

    const client = new Client({connectionString});
    client.on('error', (error) => {
        console.log(`Unexpected DB connection error! ${error.message}`);
    });

    await client.connect();

    return client;
}

module.exports = createDbConnection;
