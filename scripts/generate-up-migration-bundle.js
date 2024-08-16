const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;
const shell = require('shelljs');

const {workingDir} = require('./constants');

const bundleDbMigrations = require('./helpers/bundleDbMigrations');

async function generateUpMigrationBundle() {
    if (!argv.upTo || !argv.upFrom) {
        throw new Error('Must specify upTo and upFrom arguments to use this target!');
    }

    shell.mkdir('-p', workingDir);

    const {upTo: to, upFrom: from} = argv;
    const sql = await bundleDbMigrations(from, to, 'up');
    const filename = `${Date.now()}-UP-${from}-to-${to}.sql`;
    const filePath = path.join(workingDir, filename);

    fs.writeFileSync(filePath, sql);

    console.log(`Migration bundle written to ${filePath}`);
}

if (require.main === module) {
    generateUpMigrationBundle();
}

module.exports = generateUpMigrationBundle;
