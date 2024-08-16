const path = require('path');

const projectRoot = path.join(__dirname, '../');
const workingDir = path.join(projectRoot, 'output');

const directories = {
    baseDir: projectRoot,
    workingDir,
    stagingDir: path.join(workingDir, 'staging'),
    distDir: path.join(workingDir, 'dist'),
    reportsDir: path.join(workingDir, 'reports'),
    buildDir: path.join(projectRoot, 'build'),
    srcDirs: [
        path.join(projectRoot, 'azure-functions'),
        path.join(projectRoot, 'azure-functions/schema'),
        path.join(projectRoot, 'azure-functions/config')
    ]
};

const manifestPath = path.join(projectRoot, 'package.json');
const fastifyManifestPath = path.join(projectRoot, 'fastify-api/package.json');
const sharedManifestPath = path.join(projectRoot, 'shared/package.json');

const manifests = {
    manifestPath,
    fastifyManifestPath,
    manifest: require(manifestPath),
    fastifyManifest: require(fastifyManifestPath),
    sharedManifest: require(sharedManifestPath)
};

const name = manifests.manifest.name;
const version = manifests.manifest.version || 'unknown';

// setup local dev env variables if needed
const {
    Values: {BAXTER_ENV}
} = require('../azure-functions/local.settings.json');

if (BAXTER_ENV === 'local') {
    require('dotenv').config({
        path: path.join(directories.buildDir, 'local.env')
    });
}

module.exports = {
    ...directories,
    ...manifests,
    name,
    version,
    environment: process.env
};
