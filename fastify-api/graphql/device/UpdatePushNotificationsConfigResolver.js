const {
    updateDevicePushNotificationConfig,
    createNotificationHub,
    createRegistrationId,
    createOrUpdateNativeRegistration,
    listRegistrationsByTag,
    generateIv,
    getLogger,
    NotFoundError,
    getDeviceInfo,
    CONSTANTS: {
        OHANA_ROLES: {FAMILY_MEMBER}
    }
} = require('ohana-shared');

async function UpdatePushNotificationsConfigResolver(_parent, args, context) {
    const logger = getLogger('UpdatePushNotificationsConfigResolver', context);
    const {userId, role} = context;

    const notificationHubClient = await createNotificationHub();
    const {deviceId, deviceName, deviceToken, notificationPlatform, partialKey} = args.config;

    let registrationId = await createRegistrationId(notificationHubClient);

    // splitting the logic for Family Members and Caregiver registration
    // since FMs can only have one registered device at a time and CGs can have multiple
    if (role === FAMILY_MEMBER) {
        const registrations = await listRegistrationsByTag(notificationHubClient, userId);
        let registration = null;
        if (registrations.length) {
            registration = registrations.find(
                (registration) =>
                    registration.fcmV1RegistrationId === deviceToken ||
                    registration.deviceToken === deviceToken
            );
        }

        registrationId = registration ? registration.registrationId : registrationId;
    } else {
        const device = await getDeviceInfo(deviceId);

        if (device?.registrationId) {
            registrationId = device.registrationId;
        }
    }

    const iv = generateIv();
    await createOrUpdateNativeRegistration(notificationHubClient, notificationPlatform, {
        registrationId,
        deviceToken,
        userId
    });

    const result = await updateDevicePushNotificationConfig({
        userId,
        iv,
        deviceId,
        deviceName,
        deviceToken,
        notificationPlatform,
        partialKey,
        registrationId
    });
    if (!result) {
        logger.error('Device info not found');
        throw new NotFoundError({description: 'Device info not found'});
    }

    return result;
}

module.exports = UpdatePushNotificationsConfigResolver;
