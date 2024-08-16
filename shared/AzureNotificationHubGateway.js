const {
        NotificationHubsClient,
        createFcmV1RegistrationDescription,
        createAppleNotification,
        createFcmV1Notification
    } = require('@azure/notification-hubs'),
    {getLogger} = require('./logs/LoggingService'),
    {addSeconds} = require('date-fns'),
    {SOUND_NAME, APNS_EXPIRY_IN_SECS} = require('./constants'),
    {v4: uuid} = require('uuid');

const isLocalEnv = process.env.BAXTER_ENV === 'local';

const logger = getLogger('AzureNotificationHubGateway');

const notificationHubServiceMock = {
    createRegistrationId: () => {
        logger.info('Called create registration id...');
        return uuid().toString();
    },
    listRegistrationsByTag: () => {
        logger.info('Listing device registrations by tag...');
        return [];
    },
    deleteRegistration: () => {
        logger.info('Delete registered device...');
        return {};
    },
    createOrUpdateRegistration: () => {
        logger.info('Called or updating native registration...');
        return {};
    },
    sendNotification: () => {
        logger.info('Sending push notification...');
        return {};
    }
};

/**
 *
 * @returns {NotificationHubsClient|*}
 */
async function createNotificationHub() {
    logger.debug('Create notification hub started');
    if (isLocalEnv) {
        logger.info('Notification hub service created on local env');
        return notificationHubServiceMock;
    }

    return new NotificationHubsClient(
        process.env.NOTIFICATION_HUB_CONNECTION_STRING,
        process.env.NOTIFICATION_HUB_NAME
    );
}

/**
 *
 * @param notificationHubClient
 * @returns {Promise<unknown>|String}
 */
async function createRegistrationId(notificationHubClient) {
    logger.debug('Create registration id started');
    if (isLocalEnv) {
        logger.info('Registration id created on local env');
        return notificationHubServiceMock.createRegistrationId();
    }

    return notificationHubClient.createRegistrationId();
}

/**
 *
 * @param notificationHubClient
 * @param notificationPlatform - can be gcm os apns
 * @param args - deviceToken and tags
 * @returns {Promise<unknown>|*}
 */
async function createOrUpdateNativeRegistration(notificationHubClient, notificationPlatform, args) {
    logger.debug('Create or update native registration started');
    if (isLocalEnv) {
        logger.info('Create or update native registration done on local env');
        return notificationHubServiceMock.createOrUpdateRegistration();
    }

    const {deviceToken, userId, registrationId} = args;
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
 * @param userId String
 * @param payload Object
 * @returns {Promise<unknown>}
 */
async function sendPushNotification(notificationHubClient, userId, payload) {
    logger.debug('Sending push notification');
    if (isLocalEnv) {
        logger.info('Push notification sent from local env');
        return notificationHubServiceMock.sendNotification();
    }

    return notificationHubClient.sendNotification(payload, {tagExpression: userId});
}

async function generatePushNotificationPayload(notificationPlatform, data) {
    logger.debug('Generating push notification');
    if (isLocalEnv) {
        logger.info('Creating push notification content...');
        return {};
    }
    // if no body, initialize body to be an empty space in order to display the PN banner and the PN to be sent with sound
    let payload;
    if (notificationPlatform === 'gcm') {
        payload = await generateAndroidNotificationPayload(data);
    } else {
        payload = await generateAppleNotificationPayload(data);
    }

    logger.debug('Push notification content generated successful');
    return payload;
}

/**
 *
 * @param notificationHubClient
 * @param userId String
 * @returns {Promise<unknown>}
 */
async function listRegistrationsByTag(notificationHubClient, userId) {
    logger.debug('List registrations by tags');
    if (isLocalEnv) {
        return notificationHubServiceMock.listRegistrationsByTag();
    }

    const registrations = notificationHubClient.listRegistrationsByTag(userId);

    const registeredDevices = [];
    for await (const pages of registrations.byPage()) {
        for (const item of pages) {
            registeredDevices.push(item);
        }
    }

    return registeredDevices;
}

/**
 *
 * @param notificationHubClient
 * @param registrationId String
 * @returns {Promise<unknown>}
 */
async function deleteRegistration(notificationHubClient, registrationId) {
    logger.debug('Deleting device registration');
    if (isLocalEnv) {
        return notificationHubServiceMock.deleteRegistration();
    }

    return notificationHubClient.deleteRegistration(registrationId);
}

/**
 *
 * @param data
 * @returns {Promise<unknown>}
 */
async function generateAndroidNotificationPayload(data) {
    const {title, body = ' ', sender, type, mediaType, isMuted = false, patientId} = data;
    const commonData = {
        body,
        message: body,
        ...sender,
        type,
        mediaType,
        patientId: patientId ? patientId.toString() : null,
        title
    };

    const androidConfig = {
        android: {priority: 'high'}
    };

    let androidMessagePayload = isMuted
        ? {data: commonData, ...androidConfig}
        : {notification: {title, body}, data: {title, body, ...commonData}, ...androidConfig};

    logger.debug('Composing android notification payload...');
    return createFcmV1Notification({
        body: JSON.stringify({
            message: androidMessagePayload
        })
    });
}

async function generateAppleNotificationPayload(data) {
    const {
        title,
        body = ' ',
        message,
        sender,
        type,
        mediaType,
        isMuted = false,
        patientId,
        badge
    } = data;

    const apsPayload = {
        ...(isMuted
            ? {'content-available': 1, badge}
            : {sound: SOUND_NAME, alert: {title, body}, badge})
    };

    const customBody = {
        aps: apsPayload,
        expiry: addSeconds(new Date(), APNS_EXPIRY_IN_SECS),
        message,
        sender,
        type,
        mediaType,
        patientId,
        platform: 'apple'
    };

    return createAppleNotification({
        body: JSON.stringify(customBody),
        headers: {
            'apns-priority': '10'
        }
    });
}

async function removeAllRegisteredUserDevices(notificationHubClient, userId) {
    try {
        const registeredDevices = await listRegistrationsByTag(notificationHubClient, userId);

        await Promise.all(
            registeredDevices.map(async (device) => {
                if (device?.registrationId) {
                    await deleteRegistration(notificationHubClient, device.registrationId);
                }
            })
        );
    } catch (error) {
        logger.error({error, userId}, 'Error removing devices for a user');
    }
}

module.exports = {
    createNotificationHub,
    createRegistrationId,
    createOrUpdateNativeRegistration,
    sendPushNotification,
    generatePushNotificationPayload,
    listRegistrationsByTag,
    deleteRegistration,
    removeAllRegisteredUserDevices
};
