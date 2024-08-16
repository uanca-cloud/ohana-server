const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;
const shell = require('shelljs');
const AdmZip = require('adm-zip');

const {workingDir, buildDir} = require('./constants');
const getSqlPaths = require('./helpers/getSqlPaths');

const oneOffsDir = path.join(buildDir, 'db/one-offs');

async function generateOneOffBundle() {
    shell.mkdir('-p', `${workingDir}`);
    if (!argv.upTo || !argv.upFrom) {
        throw new Error('Must specify upTo and upFrom arguments to use this target!');
    }

    const {upTo: to, upFrom: from} = argv;

    const filePaths = await getSqlPaths(from, to, oneOffsDir);
    const oneOffBundleFilePath = path.join(
        workingDir,
        `${Date.now()}-ONE-OFFS-${from}-to-${to}.sql.zip`
    );

    const file = new AdmZip();
    filePaths.forEach((subPath) => {
        const filePath = path.join(buildDir, 'db/one-offs', subPath);
        file.addLocalFile(filePath, 'one-offs');
    });

    fs.writeFileSync(oneOffBundleFilePath, file.toBuffer());

    console.log(`One-off bundle written to ${oneOffBundleFilePath}`);
}

if (require.main === module) {
    generateOneOffBundle();
}

module.exports = generateOneOffBundle;
