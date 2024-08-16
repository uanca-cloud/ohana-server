const {getLocationQuickMessages} = require('ohana-shared');

async function LocationQuickMessagesResolver(_parent, args, {tenantId}) {
    const {locationId} = args;

    return getLocationQuickMessages({locationId, tenantId});
}

module.exports = LocationQuickMessagesResolver;
