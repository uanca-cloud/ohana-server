const createDbConnection = require('./helpers/createDbConnection');
const generateDbFixtures = require('./helpers/generateDbFixtures');

async function runSQL(fixtureSQL) {
    let client;
    try {
        client = await createDbConnection();
        await client.query(fixtureSQL);
    } finally {
        await client.end();
    }
}

async function dbInsertFixtures() {
    console.log('Inserting database fixtures...');

    try {
        const fixtureSQL = await generateDbFixtures();
        try {
            await runSQL(fixtureSQL);
            console.log('Inserted fixtures');
        } catch (error) {
            console.error(`Error inserting fixtures: ${error}`);
        }
    } catch (error) {
        console.error(`Error connecting to database: ${error}`);
    }
}

if (require.main === module) {
    dbInsertFixtures();
}

module.exports = dbInsertFixtures;
