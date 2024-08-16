const {updateLocationQuickMessagesOrder} = require('ohana-shared');

async function UpdateLocationQuickMessagesOrderResolver(_parent, args, {tenantId}) {
    const {locationId, quickMessagesOrder} = args;
    return updateLocationQuickMessagesOrder({
        locationId,
        quickMessagesIds: quickMessagesOrder,
        tenantId
    });
}

module.exports = UpdateLocationQuickMessagesOrderResolver;
