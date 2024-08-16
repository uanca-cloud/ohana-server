const {
    getLogger,
    removeUserPatientMappingsByUserIds,
    bootstrapAzf,
    refreshSessionIndex,
    runWithTransaction,
    getPatientsWithChatChannelLinkedToUser,
    removeChatMembers,
    CONSTANTS: {DISABLE_CSA_INTEGRATION},
    removeDeviceInfosByUserIds,
    unWatchAllChatSubscriptions,
    getDeviceInfoForUsers,
    createNotificationHub,
    deleteRegistration,
    removeAllRegisteredUserDevices
} = require('ohana-shared');

/**
 *
 * RESOURCES USED BY THE CRON:
 *      - LATEST_SESSIONS_HASH - redis hash where the latest caregiver session is stored
 *      - user_patients_mapping table is being cleared up for all caregivers with an expired session
 * @param context
 * @param myTimer
 * @returns {Promise<void>}
 * @constructor
 */

const logger = getLogger('CleanupCaregiverAssociatesScheduledFunction');
let bootstrapped = false;

async function CleanupCaregiverAssociatesScheduledFunction() {
    logger.debug('ENTER:CleanupCaregiverAssociates');

    if (!bootstrapped) {
        await bootstrapAzf(false);
    }

    const caregiversToBeUnassociated = await refreshSessionIndex();
    const notificationHubClient = await createNotificationHub();

    if (caregiversToBeUnassociated.length) {
        if (!DISABLE_CSA_INTEGRATION) {
            for (let caregiver of caregiversToBeUnassociated) {
                const {userId, tenantShortCode, role} = caregiver;
                const patients = await getPatientsWithChatChannelLinkedToUser(userId);

                const removeChatMembersResponse = await Promise.allSettled(
                    patients.map(
                        async (patient) =>
                            await removeChatMembers(patient.patientUlid, tenantShortCode, userId, [
                                {
                                    id: userId,
                                    role
                                }
                            ])
                    )
                );

                removeChatMembersResponse.map((response) => {
                    if (response.status === 'rejected') {
                        logger.error(
                            {error: response.reason, userId, tenantId: tenantShortCode},
                            'Unexpected Error while removing chat members from csa.'
                        );
                    }
                });

                try {
                    await unWatchAllChatSubscriptions(tenantShortCode, userId);
                } catch (error) {
                    logger.error({error, userId}, 'Error un-watching all chat subscription');
                }

                await removeAllRegisteredUserDevices(notificationHubClient, userId);
            }
        }

        const userIds = caregiversToBeUnassociated.map((caregiver) => caregiver.userId);
        try {
            const devices = await getDeviceInfoForUsers(userIds);

            if (devices.length > 0) {
                await Promise.all(
                    devices.map(async (device) => {
                        if (device?.registrationId) {
                            await deleteRegistration(notificationHubClient, device.registrationId);
                        }
                    })
                );
            }
        } catch (error) {
            logger.error({error, userIds}, 'Error removing device');
        }

        await runWithTransaction((dbClient) => {
            const userIds = caregiversToBeUnassociated.map((user) => user.userId);
            return Promise.all([
                removeUserPatientMappingsByUserIds(userIds, dbClient),
                removeDeviceInfosByUserIds(userIds, dbClient)
            ]);
        });
    }

    logger.debug('EXIT:CleanupCaregiverAssociates');
}

module.exports = CleanupCaregiverAssociatesScheduledFunction;
