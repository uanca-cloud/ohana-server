const fs = require('fs'),
    path = require('path');

//function that imports .graphql files
const importGraphQL = (file) => {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8');
};

const csaQueries = {
    registerTenant: importGraphQL('./RegisterTenant.graphql'),
    createChannel: importGraphQL('./CreateChannel.graphql'),
    sendChat: importGraphQL('./SendChat.graphql'),
    addMembersToChannel: importGraphQL('./AddMembersToChannel.graphql'),
    removeMemberFromChannel: importGraphQL('./RemoveMemberFromChannel.graphql'),
    channelBySeed: importGraphQL('./ChatHistory.graphql'),
    channels: importGraphQL('./InitialHistory.graphql'),
    members: importGraphQL('./Members.graphql'),
    chatInformation: importGraphQL('./ChatChannelInformation.graphql'),
    markChatsAsRead: importGraphQL('./MarkChatsAsRead.graphql'),
    watchReadReceipt: importGraphQL('./WatchReadReceipt.graphql'),
    unWatchReadReceipt: importGraphQL('./UnwatchReadReceipt.graphql'),
    unWatchAllChatSubscriptions: importGraphQL('./UnwatchAllChatSubscriptions.graphql'),
    deleteChannel: importGraphQL('./DeleteChannel.graphql'),
    updateChannelNotificationLevel: importGraphQL('./UpdateChannelNotificationLevel.graphql')
};

module.exports = {csaQueries};
