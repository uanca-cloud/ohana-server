const {updateLocationQuickMessage} = require('ohana-shared');

async function UpdateLocationQuickMessageResolver(_parent, args, {tenantId}) {
    const {messageId, quickMessages} = args;
    return updateLocationQuickMessage({messageId, quickMessages, tenantId});
}

module.exports = UpdateLocationQuickMessageResolver;
