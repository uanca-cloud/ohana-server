const {getAllLocationFixedContents} = require('ohana-shared');

async function FixedContentsResolver(_parent, args, {tenantId}) {
    const {locationId} = args;

    return getAllLocationFixedContents({locationId, tenantId});
}

module.exports = FixedContentsResolver;
