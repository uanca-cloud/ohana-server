const path = require('path');
const fs = require('fs');
const template = require('lodash.template');

const {
    buildDir,
    environment: {
        PG_BASIC_USERNAME,
        PG_BASIC_PASSWORD,
        PG_REPORTING_USERNAME,
        PG_REPORTING_PASSWORD,
        PG_LOG_DB,
        PG_LOG_USERNAME,
        PG_LOG_PASSWORD
    }
} = require('./constants');

const createDbConnection = require('./helpers/createDbConnection');

const ohanaSqlTemplatePath = path.join(buildDir, 'db/pg_setup_assets.sql.template');

async function dbCreateAssets() {
    console.log('Creating database assets...');

    let ohanaClient;

    try {
        const ohanaSqlTemplate = fs.readFileSync(ohanaSqlTemplatePath, 'utf8');
        const ohanaSetupLines = template(ohanaSqlTemplate)({
            PG_BASIC_USERNAME,
            PG_BASIC_PASSWORD,
            PG_REPORTING_USERNAME,
            PG_REPORTING_PASSWORD,
            PG_LOG_DB,
            PG_LOG_USERNAME,
            PG_LOG_PASSWORD
        });

        ohanaClient = await createDbConnection();
        const ohanaLinePromises = ohanaSetupLines.split('\n').map(async (line) => {
            console.log(line);
            return ohanaClient.query(line);
        });

        await Promise.all(ohanaLinePromises);

        console.log('Inserted database assets');
    } catch (error) {
        console.error(`Error connecting to database: ${error}`);
    } finally {
        await ohanaClient?.end();
    }
}

if (require.main === module) {
    dbCreateAssets();
}

module.exports = dbCreateAssets;
