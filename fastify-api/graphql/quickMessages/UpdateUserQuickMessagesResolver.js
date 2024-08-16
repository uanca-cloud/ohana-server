const {updateUserQuickMessages} = require('ohana-shared');

async function UpdateUserQuickMessagesResolver(_parent, args, {userId}) {
    const {quickMessages} = args;
    return updateUserQuickMessages({quickMessages, userId});
}

module.exports = UpdateUserQuickMessagesResolver;
