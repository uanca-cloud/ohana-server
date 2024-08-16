const {getLocationFixedContents} = require('ohana-shared');

async function LocationFixedContentsResolver(_parent, args, {tenantId}) {
    const {locationId} = args;

    return getLocationFixedContents({locationId, tenantId});
}

module.exports = LocationFixedContentsResolver;
