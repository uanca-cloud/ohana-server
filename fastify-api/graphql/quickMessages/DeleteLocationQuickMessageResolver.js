const {deleteLocationQuickMessage} = require('ohana-shared');

async function DeleteLocationQuickMessagesResolver(_parent, args, {tenantId}) {
    const {messageId} = args;
    return deleteLocationQuickMessage({messageId, tenantId});
}

module.exports = DeleteLocationQuickMessagesResolver;
