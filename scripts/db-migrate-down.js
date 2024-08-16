const argv = require('yargs').argv;

const runSqlTransaction = require('./helpers/runSqlTransaction');
const bundleDbMigrations = require('./helpers/bundleDbMigrations');

async function dbMigrateDown() {
    if (!argv.downTo || !argv.downFrom) {
        throw new Error('Must specify downTo and downFrom arguments to use this target!');
    }

    const {downTo: to, downFrom: from} = argv;

    console.log(`DB migrating DOWN ${from} <-- ${to} ...`);

    try {
        await runSqlTransaction(async (client) => {
            const sql = bundleDbMigrations(to, from, 'down');
            console.log(sql);
            await client.query(sql);
        });

        console.log(`DB migration ${from} --> ${to} complete.`);
    } catch (error) {
        console.error(`DB migration failure: ${error}`);
    }
}

if (require.main === module) {
    dbMigrateDown();
}

module.exports = dbMigrateDown;
