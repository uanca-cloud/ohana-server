const {RedisPubSub} = require('graphql-redis-subscriptions'),
    {
        SUBSCRIPTION_TOPICS: {CHAT_UPDATES},
        CHAT_UPDATE_TYPES: {
            CHAT_LOCATION_ENABLED_UPDATE,
            CHAT_PATIENT_ENABLED_UPDATE,
            READ_RECEIPT_UPDATE,
            NOTIFICATION_LEVEL_UPDATE
        },
        CSA_PRODUCT_OID,
        REDIS_CONNECTION_STRING,
        OHANA_ROLES: {FAMILY_MEMBER}
    } = require('../constants'),
    {
        queue,
        createPushNotificationPayload,
        createSubscriptionPayload
    } = require('./PublisherHelper'),
    {getUsersAndDevicesByPatientId, getUsersByLocationId} = require('../user/UserDao'),
    {updateChatCountForPatient} = require('../SessionService'),
    {
        getDeviceIdsFromUserIds,
        getDeviceIdsAndNotificationLevelsFromUserIds
    } = require('../device/DeviceInfoDao'),
    {getLogger} = require('../logs/LoggingService'),
    {sendPushNotification, createNotificationHub} = require('../AzureNotificationHubGateway'),
    {hasPubSubConnection} = require('./AzurePubSubClient'),
    {getUnreadUpdatesByPatientId} = require('../updates/UpdatesDao');

const logger = getLogger('ChatUpdatePublisher');
const pubSub = new RedisPubSub({connection: REDIS_CONNECTION_STRING});

function getAsyncIterator(deviceId) {
    return pubSub.asyncIterator(`${CHAT_UPDATES}-${deviceId}`);
}

function publishPatientChatToggle(patientId, chatPatientEnabled, senderDeviceId) {
    return queue(async () => {
        // get all users mapped to patient id
        const recipients = await getUsersAndDevicesByPatientId(patientId, senderDeviceId);
        const payload = {
            __typeName: CHAT_PATIENT_ENABLED_UPDATE,
            patientId,
            chatPatientEnabled
        };
        recipients.forEach((recipient) => {
            pubSub.publish(`${CHAT_UPDATES}-${recipient.deviceId}`, payload);
        });
    });
}

function publishLocationChatToggle(locationId, chatLocationEnabled) {
    return queue(async () => {
        // get all users for location
        const recipients = await getUsersByLocationId(locationId);
        const payload = {
            __typeName: CHAT_LOCATION_ENABLED_UPDATE,
            locationId,
            chatLocationEnabled: chatLocationEnabled === 'true'
        };
        recipients.forEach((recipient) => {
            pubSub.publish(`${CHAT_UPDATES}-${recipient.deviceId}`, payload);
        });
    });
}

/**
 * Async function processes a recipient object to either publish a Pub/Sub message or send a push notification.
 *
 * @async
 * @param {object} payload - Contains recipient, senderUser, patientId, notificationHubClient,
 *                           subscriptionPayload, userChatCounts data.
 * @param {object} payload.recipient - The recipient's detailed information.
 * @param {object} payload.senderUser - Sender details for the push notification.
 * @param {string} payload.patientId - The patient ID associated with the chat.
 * @param {object} payload.notificationHubClient - Client for sending push notifications.
 * @param {object} payload.subscriptionPayload - The payload for subscription.
 * @param {object} payload.userChatCounts - Contains userIds and their respective unread chat message counts.
 * @returns {Promise<*>} - The function returns a Promise that resolves when the notification publication or push is done.
 * @throws {Error} Will throw an error if any of the processes within this function fails.
 */
async function processRecipient(payload) {
    const {
        recipient,
        senderUser,
        patientId,
        notificationHubClient,
        subscriptionPayload,
        userChatCounts
    } = payload;
    const hasOpenConnections = await hasPubSubConnection(recipient.deviceId);
    if (!hasOpenConnections) {
        const isMuted = recipient.notificationLevel === 'mute';
        let badgeCount = userChatCounts[recipient.userId];

        if (recipient.role === FAMILY_MEMBER) {
            const unreadUpdateCount = await getUnreadUpdatesByPatientId(
                patientId,
                recipient.userId
            );
            badgeCount += unreadUpdateCount;
        }

        const payload = await createPushNotificationPayload({
            recipient,
            senderUser,
            isMuted,
            patientId,
            badge: badgeCount
        });
        return sendPushNotification(notificationHubClient, recipient.userId, payload);
    } else {
        const payload = {
            ...subscriptionPayload,
            unreadChatMessageCount: userChatCounts[recipient.userId]
        };
        return pubSub.publish(`${CHAT_UPDATES}-${recipient.deviceId}`, payload);
    }
}

/**
 * Asynchronously publishes a new chat message using NotificationHub.
 *
 * @async
 * @param {string} patientId - The ID of the patient associated with the chat.
 * @param {object} chat - The chat object related to the new message.
 * @param {object} senderUser - Sender user details for the chat.
 * @param {string[]} recipientIds - An array of IDs of the recipients.
 * @returns {Promise<void>} - The function doesn't explicitly return anything; it ends when all messages are published.
 * @throws {Error} Will throw an error if creating NotificationHub, updating chat count, getting device IDs and NotificationLevels from user IDs, or processing recipients fails.
 */
async function publishNewChatMessage(patientId, chat, senderUser, recipientIds) {
    const notificationHubClient = await createNotificationHub();

    const subscriptionPayload = createSubscriptionPayload({chat, senderUser, patientId});

    return queue(async () => {
        // increment chat unread count for all recipients
        const userChatCounts = await updateChatCountForPatient(recipientIds, patientId);

        let senderDeviceId;
        const chatMetadata = JSON.parse(chat.metadata);
        if (chatMetadata) {
            senderDeviceId = chatMetadata[CSA_PRODUCT_OID]?.senderDeviceId;
        }

        let recipients = await getDeviceIdsAndNotificationLevelsFromUserIds(
            recipientIds,
            patientId,
            senderDeviceId
        );

        if (!recipients?.length) {
            logger.error({metadata: {patientId, recipientIds}}, 'No recipient devices found');
            return;
        }

        const results = await Promise.allSettled(
            recipients.map((recipient) =>
                processRecipient({
                    recipient,
                    senderUser,
                    patientId,
                    notificationHubClient,
                    subscriptionPayload,
                    userChatCounts
                })
            )
        );

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.error(
                    {
                        metadata: {
                            patientId,
                            userId: recipients[index].userId,
                            deviceId: recipients[index].deviceId,
                            reason: result.reason
                        }
                    },
                    `Error processing recipient`
                );
            }
        });
    });
}

async function publishChatReadReceipt(patientId, orderNumber, recipientIds) {
    return queue(async () => {
        const userChatCounts = await updateChatCountForPatient(recipientIds, patientId, false);

        let userDeviceInfos = await getDeviceIdsFromUserIds(recipientIds);

        if (!userDeviceInfos) {
            logger.error('No recipient devices found');
            return;
        }

        const subscriptionPayload = {
            __typeName: READ_RECEIPT_UPDATE,
            patientId,
            orderId: orderNumber
        };

        await Promise.all([
            userDeviceInfos.map((userDeviceInfo) => {
                logger.debug(
                    {metadata: {userId: userDeviceInfo.userId, deviceId: userDeviceInfo.deviceId}},
                    'Sending message through pubsub connection'
                );

                const payload = {
                    ...subscriptionPayload,
                    unreadChatMessageCount: userChatCounts[userDeviceInfo.userId]
                };
                pubSub.publish(`${CHAT_UPDATES}-${userDeviceInfo.deviceId}`, payload);
            })
        ]);
    });
}

function publishMuteChatNotifications(patientId, notificationLevel, userId, senderDeviceId) {
    return queue(async () => {
        // get all user devices for userId
        const recipients = await getDeviceIdsFromUserIds([userId], senderDeviceId);
        const payload = {
            __typeName: NOTIFICATION_LEVEL_UPDATE,
            patientId,
            notificationLevel
        };
        recipients.forEach((recipient) => {
            pubSub.publish(`${CHAT_UPDATES}-${recipient.deviceId}`, payload);
        });
    });
}

module.exports = {
    getAsyncIterator,
    publishPatientChatToggle,
    publishLocationChatToggle,
    publishNewChatMessage,
    publishChatReadReceipt,
    publishMuteChatNotifications
};
