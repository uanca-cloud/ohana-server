const {updateLocationFixedContentsOrder} = require('ohana-shared');

async function UpdateLocationFixedContentsOrderResolver(_parent, args, {tenantId}) {
    const {locationId, fixedContentsOrder} = args;
    return updateLocationFixedContentsOrder({
        locationId,
        fixedContentsIds: fixedContentsOrder,
        tenantId
    });
}

module.exports = UpdateLocationFixedContentsOrderResolver;
