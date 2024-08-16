const fs = require('fs');
const path = require('path');
const template = require('lodash.template');

const {buildDir} = require('../constants');

async function generateDbFixtures() {
    const templatePath = path.join(buildDir, 'db/fixture_data.sql.template');
    const fixtureSQLTemplate = fs.readFileSync(templatePath, 'utf8');
    return template(fixtureSQLTemplate)();
}

module.exports = generateDbFixtures;
