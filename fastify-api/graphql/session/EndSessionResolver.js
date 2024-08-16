const {
    removeUserPatientMapping,
    CONSTANTS: {
        REDIS_COLLECTIONS: {SESSION},
        OHANA_ROLES: {CAREGIVER, ADMINISTRATOR},
        DISABLE_CSA_INTEGRATION
    },
    delRedisCollectionData,
    deleteSessionBySessionId,
    getLogger,
    removeUserAsChatMember,
    removeDeviceInfo,
    getPatientsWithChatChannelLinkedToUser,
    removeDeviceInfoByDeviceId,
    unWatchAllChatSubscriptions,
    unWatchReadReceipt,
    getChatReadReceiptsSubscriptionId,
    createNotificationHub,
    getDeviceInfo,
    deleteRegistration,
    removeAllRegisteredUserDevices
} = require('ohana-shared');

async function EndSessionResolver(_parent, _args, context) {
    const logger = getLogger('EndSessionResolver', context);
    const {userId, deviceId, role, sessionId, tenantShortCode} = context;
    logger.debug('Ending session...');
    //utilize role over assignedRoles here because we will end the user's session based on how they logged in
    if (role === ADMINISTRATOR) {
        return delRedisCollectionData(SESSION, sessionId);
    }

    const subscriptionId = await getChatReadReceiptsSubscriptionId(userId);
    const remainingSessionIds = await deleteSessionBySessionId(sessionId);
    const notificationHubClient = await createNotificationHub();

    if (role === CAREGIVER) {
        if (remainingSessionIds.length === 0) {
            if (!DISABLE_CSA_INTEGRATION) {
                const patients = await getPatientsWithChatChannelLinkedToUser(userId);

                for (let patient of patients) {
                    await removeUserAsChatMember(
                        userId,
                        patient.patientUlid,
                        tenantShortCode,
                        deviceId
                    );
                }
            }

            await Promise.all([
                removeUserPatientMapping(userId),
                removeDeviceInfo(userId),
                removeAllRegisteredUserDevices(notificationHubClient, userId)
            ]);
        } else {
            try {
                const deviceInfo = await getDeviceInfo(deviceId);
                if (deviceInfo?.registrationId) {
                    await deleteRegistration(notificationHubClient, deviceInfo.registrationId);
                }
            } catch (error) {
                logger.error({error, userId, deviceId}, 'Error removing device');
            }

            await removeDeviceInfoByDeviceId(deviceId, userId);
        }
    }

    if (remainingSessionIds.length === 0 && !DISABLE_CSA_INTEGRATION) {
        if (subscriptionId) {
            await unWatchReadReceipt(subscriptionId, tenantShortCode, userId);
        } else {
            await unWatchAllChatSubscriptions(tenantShortCode, userId);
        }
    }

    return true;
}

module.exports = EndSessionResolver;
