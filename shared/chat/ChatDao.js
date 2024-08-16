const {makeCsaHttpRequest} = require('../csa/CsaHttpGateway'),
    {getLogger} = require('../logs/LoggingService'),
    {csaQueries} = require('../csa/graphql/GraphQLFileHelper'),
    {
        CSA_PRODUCT_OID,
        OHANA_ROLES: {FAMILY_MEMBER},
        CSA_SEED_PREFIX,
        CHANNEL_RESPONSE_LIMIT
    } = require('../constants'),
    CSAError = require('../custom-errors/csa-error');

const logger = getLogger('ChatDao');

async function createChatChannel(patientUlid, userId, tenantId, members) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            members: generateMembersListForCreateChannel(members),
            autoWatch: true,
            openMembership: true,
            individualReadReceipt: true
        }
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'createChannel',
        csaQueries.createChannel,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Creating a chat channel on CSA failed');
        throw new CSAError({message: 'Creating a chat channel on CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.createChannel ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Creating a chat channel on CSA failed'
        );
        throw new CSAError({message: 'Creating a chat channel on CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully created a chat channel on CSA');

    return responseJson;
}

async function sendChatMessage(patientUlid, tenantId, userId, text, metadata) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            priority: 'normal',
            text: text,
            metadata
        }
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'sendChat',
        csaQueries.sendChat,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Sending a message to CSA failed');
        throw new CSAError({message: 'Sending a message to CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.sendChat ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Sending a message to CSA failed'
        );
        throw new CSAError({message: 'Sending a message to CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully sent a message to CSA');

    return responseJson?.data?.sendChat?.message;
}

async function addChatMembers(patientUlid, tenantId, members) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            members: members.map((member) => {
                const metadata = {};
                metadata[`${CSA_PRODUCT_OID}`] = `{"familyMember": "${
                    member.role === FAMILY_MEMBER
                }"}}`;

                return {
                    identity: `hrc:${CSA_PRODUCT_OID}:${member.id}`,
                    metadata: JSON.stringify(metadata)
                };
            })
        }
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        patientUlid,
        'addMembersToChannel',
        csaQueries.addMembersToChannel,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Adding members to Chat Channel in CSA failed');
        throw new CSAError({message: 'Adding members to Chat Channel in CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.addMembersToChannel ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Adding members to Chat Channel in CSA failed'
        );
        throw new CSAError({message: 'Adding members to Chat Channel in CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully added members to Chat Channel in CSA');

    return responseJson?.data?.addMembersToChannel?.membersAdded;
}

async function removeChatMembers(patientUlid, tenantId, userId, members) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            members: members.map((member) => `hrc:${CSA_PRODUCT_OID}:${member.id}`)
        }
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'removeMemberFromChannel',
        csaQueries.removeMemberFromChannel,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Removing members from Chat Channel in CSA failed');
        throw new CSAError({message: 'Removing members from Chat Channel in CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.removeMembersFromChannel ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Removing members from Chat Channel in CSA failed'
        );
        throw new CSAError({message: 'Removing members from Chat Channel in CSA failed'});
    }

    if (responseJson?.data?.removeMembersFromChannel?.membersRemoved.length !== members.length) {
        logger.error(
            {
                metadata: {
                    tenantId,
                    userIds: members,
                    chatUserIds: responseJson?.data?.removeMemberFromChannel?.membersRemoved
                }
            },
            'Removing members from Chat Channel in CSA failed as not all members were removed'
        );
        throw new CSAError({
            message:
                'Removing members from Chat Channel in CSA failed as not all members were removed'
        });
    }

    logger.debug({metadata: {tenantId}}, 'Successfully removed members from Chat Channel in CSA');
    return responseJson?.data?.removeMembersFromChannel?.membersRemoved;
}

async function getChatHistory(patientUlid, tenantId, userId, limit, cursor) {
    const variables = {
        seed: `${CSA_SEED_PREFIX}${patientUlid}`,
        chatsAfter: cursor,
        chatsFirst: limit
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'channelBySeed',
        csaQueries.channelBySeed,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Getting a channel by seed from CSA failed');
        throw new CSAError({message: 'Getting a channel by seed from CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.channelBySeed ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Getting a channel by seed from CSA failed'
        );
        throw new CSAError({message: 'Getting a channel by seed from CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully obtained a channel by seed from CSA');

    return responseJson?.data?.channelBySeed?.chats;
}

function generateMembersListForCreateChannel(members) {
    return members.map((member) => {
        const metadata = {};
        metadata[`${CSA_PRODUCT_OID}`] = `{"familyMember": "${member.role === FAMILY_MEMBER}"}}`;

        return {
            identity: `hrc:${CSA_PRODUCT_OID}:${member.id}`,
            metadata: JSON.stringify(metadata)
        };
    });
}

async function initialHistory(tenantId, userId) {
    const variables = {
        input: {
            limit: CHANNEL_RESPONSE_LIMIT
        }
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'channels',
        csaQueries.channels,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Retrieving channels from CSA failed');
        throw new CSAError({message: 'Retrieving channels from CSA failed'});
    }

    const responseJson = await response.json();
    if (!responseJson?.data?.channels) {
        logger.error({metadata: {tenantId}}, 'Retrieving channels from CSA failed');
        throw new CSAError({message: 'Retrieving channels from CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully retrieved channels from CSA');

    return responseJson?.data?.channels;
}

async function getChatMembers(tenantId, userId, patientUlid, limit, offset) {
    const variables = {
        seed: `${CSA_SEED_PREFIX}${patientUlid}`,
        limit,
        offset
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'channelBySeed',
        csaQueries.members,
        variables
    );
    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Retrieving chat members from CSA failed');
        throw new CSAError({message: 'Retrieving chat members from CSA failed'});
    }
    const responseJson = await response.json();
    if (
        !responseJson?.data?.channelBySeed?.members ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Retrieving chat members from CSA failed'
        );
        throw new CSAError({message: 'Retrieving chat members from CSA failed'});
    }
    logger.debug({metadata: {tenantId}}, 'Successfully retrieved chat members from CSA');
    return responseJson?.data?.channelBySeed?.members;
}

async function getChatChannelInformation(patientUlid, tenantId, userId) {
    const variables = {
        seed: `${CSA_SEED_PREFIX}${patientUlid}`
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'channelBySeed',
        csaQueries.chatInformation,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Retrieving chat channel information from CSA failed');
        throw new CSAError({message: 'Retrieving chat channel information from CSA failed'});
    }
    const responseJson = await response.json();
    if (
        !responseJson?.data?.channelBySeed ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Retrieving chat channel information from CSA failed'
        );
        throw new CSAError({message: 'Retrieving chat channel information from CSA failed'});
    }
    logger.debug({metadata: {tenantId}}, 'Successfully retrieved chat information from CSA');
    return responseJson?.data?.channelBySeed;
}

async function markChatMessagesAsRead(patientUlid, tenantId, userId, orderNumbers) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            orderNumbers
        }
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'markChatsAsRead',
        csaQueries.markChatsAsRead,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Marking chat messages as read on CSA failed');
        throw new CSAError({message: 'Marking chat messages as read on CSA failed'});
    }
    const responseJson = await response.json();
    if (
        !responseJson?.data?.markChatsAsRead?.chats ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Marking chat messages as read on CSA failed'
        );
        throw new CSAError({message: 'Marking chat messages as read on CSA failed'});
    }
    logger.debug({metadata: {tenantId}}, 'Successfully marked chat messages as read on CSA');
    return responseJson?.data?.markChatsAsRead?.chats;
}

async function watchReadReceipt(tenantId, userId) {
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'WatchReadReceipt',
        csaQueries.watchReadReceipt,
        {}
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Registering to watch read receipts on CSA failed');
        throw new CSAError({message: 'Registering to watch read receipts on CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.watchReadReceipt ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Registering to watch read receipts on CSA failed'
        );
        throw new CSAError({message: 'Registering to watch read receipts on CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully registering to watch read receipts');

    return responseJson?.data?.watchReadReceipt;
}

async function unWatchReadReceipt(subscriptionId, tenantId, userId) {
    const variables = {
        input: {
            subscriptionId
        }
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'unWatchReadReceipt',
        csaQueries.unWatchReadReceipt,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Un-watching read receipts on CSA failed');
        throw new CSAError({message: 'Un-watching read receipts on CSA failed'});
    }
    const responseJson = await response.json();
    if (responseJson?.errors && responseJson?.errors?.length !== 0) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Un-watching read receipts on CSA failed'
        );
        throw new CSAError({message: 'Un-watching read receipts on CSA failed'});
    }
    logger.debug({metadata: {tenantId}}, 'Successfully un-watched read receipts on CSA');
    return responseJson?.data?.unWatchReadReceipt;
}

async function unWatchAllChatSubscriptions(tenantId, userId) {
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'unWatchAllChatSubscriptions',
        csaQueries.unWatchAllChatSubscriptions,
        {}
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Un-watching all chat subscriptions on CSA failed');
        throw new CSAError({message: 'Un-watching all chat subscriptions on CSA failed'});
    }
    const responseJson = await response.json();
    if (responseJson?.errors && responseJson?.errors?.length !== 0) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Un-watching all chat subscriptions on CSA failed'
        );
        throw new CSAError({message: 'Un-watching all chat subscriptions on CSA failed'});
    }
    logger.debug({metadata: {tenantId}}, 'Successfully un-watched all chat subscriptions on CSA');
    return responseJson?.data?.unWatchAllChatSubscriptions;
}

/**
 * deleteChatChannel
 * Cascading affect to chat_messages, chat_message_attachments, channel_membership
 *   and eventually member ( if user is not part of any other conv )
 *   Authorization:
 *   The request will be authorized by the X-User-Identity header value, which should be
 *   the creator of the channel regardless of weather they are a member or not.
 * @returns {Promise<void>}
 * @param {String} patientUlid
 * @param {String} userCreatorId
 * @param {String} tenantId
 */

async function deleteChatChannel(patientUlid, userCreatorId, tenantId) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`
        }
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userCreatorId,
        'deleteChannel',
        csaQueries.deleteChannel,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Deleting a chat channel on CSA failed');
        throw new CSAError({message: 'Deleting a chat channel on CSA failed'});
    }

    const responseJson = await response.json();
    if (
        !responseJson?.data?.deleteChannel ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Deleting a chat channel on CSA failed'
        );
        throw new CSAError({message: 'Deleting a chat channel on CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully deleted a chat channel on CSA');

    return responseJson;
}

async function updateChannelNotificationLevel(patientUlid, tenantId, userId, notificationLevel) {
    const variables = {
        input: {
            seed: `${CSA_SEED_PREFIX}${patientUlid}`,
            notificationLevel
        }
    };
    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'updateChannelNotificationLevel',
        csaQueries.updateChannelNotificationLevel,
        variables
    );

    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Updating channel notification level on CSA failed');
        throw new CSAError({message: 'Updating channel notification level on CSA failed'});
    }
    const responseJson = await response.json();
    if (
        !responseJson?.data?.updateChannelNotificationLevel ||
        (responseJson?.errors && responseJson?.errors?.length !== 0)
    ) {
        logger.error(
            {metadata: {tenantId, errorCode: responseJson?.errors[0]?.extensions?.code}},
            'Updating channel notification level on CSA failed'
        );
        throw new CSAError({message: 'Updating channel notification level on CSA failed'});
    }

    logger.debug({metadata: {tenantId}}, 'Successfully updated channel notification level on CSA');
    return responseJson?.data?.updateChannelNotificationLevel;
}

module.exports = {
    createChatChannel,
    sendChatMessage,
    addChatMembers,
    removeChatMembers,
    getChatHistory,
    generateMembersListForCreateChannel,
    initialHistory,
    getChatMembers,
    getChatChannelInformation,
    markChatMessagesAsRead,
    watchReadReceipt,
    unWatchReadReceipt,
    unWatchAllChatSubscriptions,
    deleteChatChannel,
    updateChannelNotificationLevel
};
