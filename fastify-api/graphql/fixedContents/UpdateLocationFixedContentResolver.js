const {updateLocationFixedContent} = require('ohana-shared');

async function UpdateLocationFixedContentResolver(_parent, args, {tenantId}) {
    const {fixedContentId, fixedContent} = args;
    return updateLocationFixedContent({id: fixedContentId, fixedContent, tenantId});
}

module.exports = UpdateLocationFixedContentResolver;
