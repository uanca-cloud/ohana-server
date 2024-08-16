const {deleteLocationFixedContent} = require('ohana-shared');

async function DeleteLocationFixedContentResolver(_parent, args, {tenantId}) {
    const {fixedContentId} = args;
    return deleteLocationFixedContent({fixedContentId, tenantId});
}

module.exports = DeleteLocationFixedContentResolver;
