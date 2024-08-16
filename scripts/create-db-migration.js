const fs = require('fs');
const argv = require('yargs').argv;
const path = require('path');
const {getUnixTime} = require('date-fns');

const {manifest, buildDir} = require('./constants');

const migrationTemplatePath = path.join(buildDir, 'db/migration.template.js');

function createDbMigration(migrationName, isOneOff) {
    if (!migrationName) {
        throw new Error('--name required when creating a new migration to pass name');
    }

    const filename = `${manifest.version}-${getUnixTime(new Date())}_${migrationName}.js`;
    const migrationTemplate = fs.readFileSync(migrationTemplatePath, 'utf8');

    if (isOneOff) {
        fs.writeFileSync(path.join(buildDir, 'db/one-offs', filename), migrationTemplate);
    } else {
        fs.writeFileSync(path.join(buildDir, 'db/migrations', filename), migrationTemplate);
    }
}

if (require.main === module) {
    const {name: migrationName, 'one-off': isOneOff} = argv;
    createDbMigration(migrationName, isOneOff);
}

module.exports = createDbMigration;
