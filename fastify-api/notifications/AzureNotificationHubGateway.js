const {
        NotificationHubsClient,
        createFcmV1RegistrationDescription
    } = require('@azure/notification-hubs'),
    {generatePushNotificationPayload} = require('ohana-shared');

/**
 *
 * @returns {NotificationHubsClient}
 */
function bootstrapNotificationHubClient() {
    return new NotificationHubsClient(
        process.env.NOTIFICATION_HUB_CONNECTION_STRING,
        process.env.NOTIFICATION_HUB_NAME
    );
}

/**
 *
 * @param notificationHubClient
 * @param notificationPlatform String
 * @param deviceToken String
 * @param userId String
 * @param registrationId String
 * @param logger
 * @returns {Promise<Object>}
 */
function registerDevice(
    notificationHubClient,
    notificationPlatform,
    deviceToken,
    userId,
    registrationId,
    logger
) {
    logger.debug('Register device...');

    let registration = {
        kind: 'Apple',
        deviceToken,
        tags: [userId],
        registrationId
    };
    if (notificationPlatform === 'gcm') {
        registration = createFcmV1RegistrationDescription({
            deviceToken,
            tags: [userId],
            registrationId,
            fcmV1RegistrationId: deviceToken
        });
    }

    return notificationHubClient.createOrUpdateRegistration(registration);
}

/**
 *
 * @param notificationHubClient
 * @param notificationPlatform String
 * @param userId String
 * @param message Object
 * @param logger
 * @param appVersion String
 * @returns {Promise<Boolean>}
 */
async function sendMessage(
    notificationHubClient,
    notificationPlatform,
    userId,
    message,
    logger,
    appVersion
) {
    logger.debug('Sending message...');

    const payload = await generatePushNotificationPayload(notificationPlatform, {
        title: '',
        body: message.data.message,
        sender: '',
        type: '',
        userId,
        appVersion
    });

    return notificationHubClient.sendNotification(payload, {tagExpression: userId});
}

module.exports = {
    bootstrapNotificationHubClient,
    registerDevice,
    sendMessage
};
