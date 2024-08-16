const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;
const shell = require('shelljs');

const {workingDir} = require('./constants');

const bundleDbMigrations = require('./helpers/bundleDbMigrations');

async function generateDownMigrationBundle() {
    if (!argv.downTo || !argv.downFrom) {
        throw new Error('Must specify downTo and downFrom arguments to use this target!');
    }

    shell.mkdir('-p', workingDir);

    const {downTo: to, downFrom: from} = argv;
    const sql = await bundleDbMigrations(to, from, 'down');
    const filename = `${Date.now()}-DOWN-${from}-to-${to}.sql`;
    const filePath = path.join(workingDir, filename);

    fs.writeFileSync(filePath, sql);

    console.log(`Migration bundle written to ${filePath}`);
}

if (require.main === module) {
    generateDownMigrationBundle();
}

module.exports = generateDownMigrationBundle;
