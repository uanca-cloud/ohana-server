const argv = require('yargs').argv;

const {manifest} = require('./constants');

const runSqlTransaction = require('./helpers/runSqlTransaction');
const bundleDbMigrations = require('./helpers/bundleDbMigrations');

async function dbMigrateUp(to) {
    //if the integration tests are being run from inside the github container instance a full migration up is needed
    let from = '0.0.0';

    console.log(`DB migrating UP ${from} --> ${to} ...`);

    try {
        await runSqlTransaction(async (client) => {
            const sql = bundleDbMigrations(from, to, 'up');
            console.log(sql);
            await client.query(sql);
        });

        console.log(`DB migration ${from} --> ${to} complete.`);
    } catch (error) {
        console.error(`DB migration failure: ${error}`);
    }
}

if (require.main === module) {
    const to = argv.upTo || manifest.version;
    dbMigrateUp(to);
}

module.exports = dbMigrateUp;
