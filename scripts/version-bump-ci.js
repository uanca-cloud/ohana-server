const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;

const {baseDir, fastifyManifest, manifest, sharedManifest} = require('./constants');

function updateFastifyManifestVersion(versionNumber, destDir) {
    fastifyManifest.version = versionNumber;

    fs.writeFileSync(path.join(destDir, 'package.json'), JSON.stringify(fastifyManifest, null, 2));
}

function updateSharedManifestVersion(versionNumber, destDir) {
    sharedManifest.version = versionNumber;

    fs.writeFileSync(path.join(destDir, 'package.json'), JSON.stringify(sharedManifest, null, 2));
}

function updateManifestVersion(versionNumber, destDir) {
    manifest.version = versionNumber;

    fs.writeFileSync(path.join(destDir, 'package.json'), JSON.stringify(manifest, null, 2));
}

function versionBumpCi() {
    const buildNumber = argv.buildNumber || 'dev';
    const newVersion = `${manifest.version}-build.${buildNumber}`;

    updateFastifyManifestVersion(newVersion, path.join(baseDir, 'fastify-api'));
    updateSharedManifestVersion(newVersion, path.join(baseDir, 'shared'));
    updateManifestVersion(newVersion, baseDir);
}

if (require.main === module) {
    versionBumpCi();
}

module.exports = versionBumpCi;
