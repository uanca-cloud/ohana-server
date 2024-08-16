const {getUserByUserId} = require('ohana-shared');

async function UserResolver(_parent, _args, {userId}) {
    return getUserByUserId(userId);
}

module.exports = UserResolver;
