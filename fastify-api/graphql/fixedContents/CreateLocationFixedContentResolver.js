const {createLocationFixedContent, createSiteWideFixedContent} = require('ohana-shared');

async function CreateLocationFixedContentResolver(_parent, args, {tenantId}) {
    const {locationId, fixedContent} = args;

    if (locationId) {
        return createLocationFixedContent({locationId, fixedContent, tenantId});
    } else {
        return createSiteWideFixedContent({fixedContent, tenantId});
    }
}

module.exports = CreateLocationFixedContentResolver;
