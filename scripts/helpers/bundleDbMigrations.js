const path = require('path');
const fs = require('fs');

const {buildDir} = require('../constants');

const getSqlPaths = require('./getSqlPaths');

function bundleDbMigrations(from, to, direction, isDBWiped = false) {
    const migrationsDir = path.join(buildDir, 'db/migrations');
    const migrationPaths = getSqlPaths(from, to, migrationsDir);
    const orderedMigrationPaths = direction === 'down' ? migrationPaths.reverse() : migrationPaths;

    const sqlMigrations = orderedMigrationPaths.map((moduleFileName) => {
        const modulePath = path.join(migrationsDir, moduleFileName);
        const module = require(modulePath);
        if (!module) {
            throw new Error(`Migration @ ${modulePath} is not a JS module!`);
        }

        if (!module.up || !module.down) {
            throw new Error(`Migration @ ${modulePath} does not have up and down exports!`);
        }

        if (typeof module.up !== 'function' || typeof module.down !== 'function') {
            throw new Error(`Migration @ ${modulePath} does not have exports which are functions!`);
        }

        const sql = direction === 'up' ? module.up() : module.down();
        if (typeof sql !== 'string') {
            throw new Error(`Migration @ ${modulePath} for ${direction} does not export string!`);
        }

        if (!sql.trim().endsWith(';')) {
            throw new Error(`Migration @ ${modulePath} must end with a semicolon!`);
        }

        return sql;
    });

    console.log(`Found ${sqlMigrations.length} migrations.`);
    if (sqlMigrations.length === 0) {
        console.log('No migrations found!  Skipping bundle generation.');
    }

    console.log(`Creating migration bundle ...`);

    let header = fs.readFileSync(path.join(buildDir, 'db/verifyMigrationVersion.sql')).toString();

    header = header.replace('$1', `'${direction === 'up' ? from : to}'`);
    header = header.replace('$2', `'${isDBWiped}'`);

    sqlMigrations.unshift(header);

    let footer = fs.readFileSync(path.join(buildDir, 'db/updateMigrationVersion.sql')).toString();

    footer = footer.replace('$3', `'${direction === 'up' ? to : from}'`);

    sqlMigrations.push(footer);

    return sqlMigrations.join('\n');
}

module.exports = bundleDbMigrations;
