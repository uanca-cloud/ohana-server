const {createLocationQuickMessage, createSiteWideQuickMessage} = require('ohana-shared');

async function CreateLocationQuickMessageResolver(_parent, args, {tenantId}) {
    const {locationId, quickMessages} = args;

    if (locationId) {
        return createLocationQuickMessage({locationId, quickMessages, tenantId});
    }
    return createSiteWideQuickMessage({quickMessages, tenantId});
}
module.exports = CreateLocationQuickMessageResolver;
