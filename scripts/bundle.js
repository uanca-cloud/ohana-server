const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const AdmZip = require('adm-zip');

const {baseDir, distDir, buildDir, workingDir} = require('./constants');

const azfSourceDir = path.join(baseDir, 'azure-functions');

function bundleAzureFunctionRelease() {
    console.log(`Creating ${distDir}...`);
    shell.mkdir('-p', distDir);
    shell.mkdir('-p', path.join(distDir, 'azure-functions'));

    // Copy over files we need to deploy
    const functions = [
        'cleanupAuditEventsScheduledFunction',
        'cleanupCaregiverAssociatesScheduledFunction',
        'sms',
        'autoUnenrollPatientScheduledFunction',
        'cleanupAttachmentsScheduledFunction',
        'audit',
        'clientLogs'
    ];

    shell.cp('-R', path.join(baseDir, 'shared'), path.join(distDir, 'shared'));
    shell.cp('-R', path.join(baseDir, 'fastify-api'), path.join(distDir, 'fastify-api'));

    functions.forEach((functionName) => {
        shell.cp('-R', path.join(azfSourceDir, functionName), path.join(distDir, functionName));
    });

    shell.cp(
        '-R',
        path.join(azfSourceDir, 'package.json'),
        path.join(distDir, 'azure-functions/package.json')
    );

    shell.cp(
        '-R',
        path.join(baseDir, 'shared/package.json'),
        path.join(distDir, 'shared/package.json')
    );
    shell.cp('-R', path.join(baseDir, 'package.json'), path.join(distDir, 'package.json'));
    shell.cp(
        '-R',
        path.join(baseDir, 'package-lock.json'),
        path.join(distDir, 'package-lock.json')
    );

    // Remove all tests
    shell.exec(`find ${distDir} -type f -name '*.spec.js' -exec rm {} +`);

    shell.cp('-R', path.join(baseDir, 'smoke-tests'), path.join(distDir, 'smoke-tests'));
    shell.cp(
        '-R',
        path.join(azfSourceDir, 'local.settings.json'),
        path.join(distDir, 'smoke-tests/local.settings.json')
    );

    shell.mkdir('-p', path.join(distDir, 'smoke-tests/azure-functions'));
    shell.mkdir('-p', path.join(distDir, 'smoke-tests/fastify-api'));
    shell.cp(
        '-R',
        path.join(azfSourceDir, 'local.settings.json'),
        path.join(distDir, 'smoke-tests/azure-functions/local.settings.json')
    );
    shell.cp(
        '-R',
        path.join(baseDir, 'fastify-api/package.json'),
        path.join(distDir, 'smoke-tests/fastify-api/package.json')
    );

    shell.mkdir(path.join(distDir, 'build'));

    shell.cp('-R', path.join(buildDir, 'local.env'), path.join(distDir, 'build/local.env'));
    shell.cp(
        '-R',
        path.join(azfSourceDir, 'local.settings.json'),
        path.join(distDir, 'local.settings.json')
    );
    shell.cp('-R', path.join(azfSourceDir, 'host.json'), path.join(distDir, 'host.json'));
    shell.cp('-R', path.join(baseDir, 'shared/schema.js'), path.join(distDir, 'schema.js'));

    shell.mkdir('-p', path.join(distDir, 'smoke-tests/build'));
    shell.mkdir('-p', path.join(distDir, 'smoke-tests/build/db'));
    shell.cp(
        '-R',
        path.join(buildDir, 'db/wipeDatabaseScript.js'),
        path.join(distDir, 'smoke-tests/build/db/wipeDatabaseScript.js')
    );

    console.log(`Generating dependencies ...`);
    shell.exec(`cd ${distDir} && npm ci --production --ignore-scripts`);

    const manifest = require(path.join(distDir, 'package.json'));
    const file = new AdmZip();
    file.addLocalFolder(distDir, '');
    const filePath = path.join(workingDir, `ohana-server-${manifest.version}.zip`);
    fs.writeFileSync(filePath, file.toBuffer());

    console.log(`Bundle created @ ${filePath}`);
}

if (require.main === module) {
    bundleAzureFunctionRelease();
}

module.exports = bundleAzureFunctionRelease;
