const {setChatCountForPatientId} = require('../SessionService'),
    {getLocationSetting} = require('../location/LocationSettingsDao'),
    {getLogger} = require('../logs/LoggingService'),
    {getUsersByIds, updateChatNotificationLevelForUser} = require('../user/UserDao'),
    {NotFoundError} = require('../custom-errors'),
    {removeChatMembers, updateChannelNotificationLevel} = require('./ChatDao'),
    {
        DISABLE_CSA_INTEGRATION,
        LOCATION_SETTINGS_KEYS: {CHAT_LOCATION_ENABLED}
    } = require('../constants'),
    {getTenantShortCode} = require('../tenant/TenantHelper'),
    {removeUserFromGroups} = require('../pubsub/AzurePubSubClient');

const logger = getLogger('ChatHelper');

function extractOhanaId(identifier) {
    return identifier.split(':').pop();
}

/**
 * Confirms chat is enabled on both patient and their location
 * @param patient
 * @param tenantId
 * @returns {Promise<*>}
 */
async function isChatEnabled(patient, tenantId) {
    const {id: patientId, enableChat, location} = patient;
    logger.debug(
        {metadata: {patientId, tenantId}},
        'Checking if chat is enabled for a patient and their location...'
    );

    //chat enabled state for patient
    if (!enableChat) {
        logger.error('Chat is not enabled on the patient.');
        return false;
    }

    //chat enabled state for patients location
    const locationSetting = await getLocationSetting({
        tenantId,
        locationId: location.id,
        key: CHAT_LOCATION_ENABLED
    });
    const chatEnabledOnLocation = locationSetting?.value === 'true';

    if (!chatEnabledOnLocation) {
        logger.error('Chat is not enabled on the patients location.');
        return false;
    }

    return true;
}

async function setRedisInitialChatCounts(userId, patientChatChannels) {
    return await Promise.all(
        patientChatChannels.map(async (channel) => {
            await setChatCountForPatientId(
                userId,
                channel.patientId,
                channel.unreadChatMessageCount
            );
        })
    );
}

async function createUserDictionary(userIds) {
    logger.debug({metadata: {userIds}}, 'Creating a user dictionary');

    // Remove duplicates so we can check the length to ensure all users were retrieved
    userIds = [...new Set(userIds)];
    const userResults = await getUsersByIds(userIds);
    if (userResults.length !== userIds.length) {
        logger.error({userIds}, 'Error occurred when getting users by user_ids!');
        throw new NotFoundError({description: 'Error occurred when getting users by user_ids!'});
    }
    const userDictionary = new Map();
    userResults.forEach((user) => {
        userDictionary.set(user.id, user);
    });
    return userDictionary;
}

/**
 * Removes a user from their chat channel as a member
 * @param userId
 * @param patientUlid
 * @param deviceId
 * @param tenantShortCode
 * @returns {Promise<void>}
 */
async function removeUserAsChatMember(userId, patientUlid, tenantShortCode, deviceId = null) {
    logger.debug(
        {metadata: {userId, patientUlid, tenantShortCode}},
        'Removing user from chat channel...'
    );
    try {
        await removeChatMembers(patientUlid, tenantShortCode, userId, [{id: userId}]);

        if (deviceId) {
            logger.debug({metadata: {deviceId}}, 'Removing user from pubsub group...');
            await removeUserFromGroups(deviceId);
        }

        logger.debug('EXIT:removeUserAsChatMember');
    } catch (error) {
        logger.error(
            {error},
            'Error occurred when removing user from chat channel or pubsub group!'
        );
    }
}

/**
 * Removes a users from their linked chat channel as members
 * @param usersData
 * @param {String} tenantShortCode
 * @returns {Promise<void>}
 */
async function removeUsersAsChatMembers(usersData, tenantShortCode = null) {
    const tenantMap = new Map(),
        usersToRemoveFromChatMap = new Map();

    if (DISABLE_CSA_INTEGRATION) {
        logger.info('Can not remove users from Chat Channels because CSA is disabled.');
        return;
    }

    for (const {patientUlid, tenant, id, deviceId} of usersData) {
        const member = {id};

        if (!patientUlid) {
            return usersToRemoveFromChatMap;
        }

        if (!tenantShortCode && !tenantMap.has(tenant.id)) {
            const tenantShortCodeResp = await getTenantShortCode(tenant.id);
            tenantMap.set(tenant.id, tenantShortCodeResp);
        }

        if (usersToRemoveFromChatMap.has(patientUlid)) {
            usersToRemoveFromChatMap.get(patientUlid).members.push(member);
        } else {
            usersToRemoveFromChatMap.set(patientUlid, {
                patientUlid,
                tenantId: tenantShortCode !== null ? tenantShortCode : tenantMap.get(tenant.id),
                members: [member]
            });
        }

        if (deviceId) {
            logger.info({metadata: {deviceId, userId: id}}, 'Removing user from pubsub group...');
            await removeUserFromGroups(deviceId);
        }
    }

    const usersToRemoveFromChatArray = [...usersToRemoveFromChatMap.values()];

    if (usersToRemoveFromChatArray.length === 0) {
        logger.info('No users have a chat channel to be removed from.');
        return;
    }

    for (const user of usersToRemoveFromChatArray) {
        logger.info(
            {
                metadata: {
                    patientUlid: user.patientUlid,
                    tenantShortCode: user.tenantId,
                    userIds: user.members
                }
            },
            'Removing users from chat channel...'
        );
        const userId = user.members[0].id;

        await removeChatMembers(user.patientUlid, user.tenantId, userId, user.members);
    }

    logger.info('EXIT:removeUsersAsChatMembers');
}

/**
 * Updates chat notification server in database and CSA
 * @param chatData
 * @returns {Promise<void>}
 */
async function updateChatNotificationLevel(chatData) {
    const {patientId, patientUlid, tenantShortCode, userId, notificationLevel} = chatData;

    await updateChannelNotificationLevel(patientUlid, tenantShortCode, userId, notificationLevel);

    await updateChatNotificationLevelForUser(userId, patientId, notificationLevel);
}

module.exports = {
    extractOhanaId,
    isChatEnabled,
    setRedisInitialChatCounts,
    createUserDictionary,
    removeUserAsChatMember,
    removeUsersAsChatMembers,
    updateChatNotificationLevel
};
