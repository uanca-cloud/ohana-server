const semver = require('semver'),
    {LAST_SUPPORTED_VERSION} = require('./constants');

function ltLastSupportedVersion(version) {
    // this is the default value for the 1.0.0 release and will be removed once 1.0.0 is no longer supported
    if (!version) {
        version = '1.0.0';
    }

    return semver.lt(version, LAST_SUPPORTED_VERSION);
}

function gte(version, supportedVersion) {
    return semver.gte(version, supportedVersion);
}

module.exports = {
    gte,
    ltLastSupportedVersion
};
