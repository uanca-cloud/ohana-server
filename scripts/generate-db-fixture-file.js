const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const {workingDir} = require('./constants');

const generateDbFixtures = require('./helpers/generateDbFixtures');

const fixturesDir = path.join(workingDir, 'fixtures');
const fixturesSqlFileName = path.join(fixturesDir, 'fixtures.sql');

async function generateDbFixtureFile() {
    const fileContents = await generateDbFixtures();
    shell.mkdir('-p', fixturesDir);
    fs.writeFileSync(fixturesSqlFileName, fileContents);
}

if (require.main === module) {
    generateDbFixtureFile();
}

module.exports = generateDbFixtureFile;
