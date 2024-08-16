const path = require('path');
const fs = require('fs');
const shell = require('shelljs');

const createWipeDatabaseQueries = require('../build/db/wipeDatabaseScript');

const bundleDbMigrations = require('./helpers/bundleDbMigrations');

const {workingDir, manifest} = require('./constants');

async function generateCleanUpMigrationBundle() {
    shell.mkdir('-p', workingDir);
    const from = manifest.version;
    const to = '0.0.0';

    const queries = await createWipeDatabaseQueries();
    let sql = queries.join('\n');
    const wipeFilename = `${Date.now()}-WIPE-${from}-to-${to}.sql`;
    fs.writeFileSync(path.join(workingDir, wipeFilename), sql);

    sql = await bundleDbMigrations(to, from, 'up', true);
    const bootstrapFilename = `${Date.now()}-BOOTSTRAP-${to}-to-${from}.sql`;
    fs.writeFileSync(path.join(workingDir, bootstrapFilename), sql);
}

if (require.main === module) {
    generateCleanUpMigrationBundle();
}

module.exports = generateCleanUpMigrationBundle;
