const remove = require('lodash/remove.js'),
    template = require('lodash.template'),
    {
        PUSH_NOTIFICATIONS_TYPES: {CHAT},
        NOTIFICATION_LEVELS: {MUTE, LOUD},
        CHAT_UPDATE_TYPES: {NEW_CHAT_MESSAGE_UPDATE},
        PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_TITLE,
        PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_BODY
    } = require('../constants'),
    {createChatMessageTemplate, createChatMemberTemplate} = require('../EntitiesFactory'),
    {generatePushNotificationPayload} = require('../AzureNotificationHubGateway');

const setImmediateIds = [];

function queue(sourceEventCallback) {
    // We call setImmediate to get into another stage of the event loop as to not block the caller
    const immediateId = setImmediate(async () => {
        clearImmediate(immediateId);
        remove(setImmediateIds, immediateId);

        setImmediate(async () => await sourceEventCallback());
    });

    setImmediateIds.push(immediateId);
}

function clearQueue() {
    setImmediateIds.forEach((setImmediateId) => clearImmediate(setImmediateId));
}

/**
 * Creates a subscription payload for a new chat message update.
 *
 * @param {object} payload - Contains chat message details and sender user details.
 * @param {object} payload.chat - Chat details like id, order, cursor, text, createdAt time, status, and metadata.
 * @param {object} payload.senderUser - Sender details like userId, firstName, lastName, role, title, and patientRelationship.
 * @param {string} payload.patientId - The patient ID associated with the chat.
 * @returns {object} - The function returns an object with the type name (`__typeName`), patientId, and a formatted chat message.
 */
function createSubscriptionPayload(payload) {
    const {chat, senderUser, patientId} = payload;
    return {
        __typeName: NEW_CHAT_MESSAGE_UPDATE,
        patientId,
        chat: createChatMessageTemplate({
            id: chat.id,
            order: chat.order,
            cursor: chat.cursor,
            text: chat.text,
            sentBy: createChatMemberTemplate({
                userId: senderUser?.id,
                firstName: senderUser?.firstName,
                lastName: senderUser?.lastName,
                role: senderUser?.role,
                title: senderUser?.title,
                patientRelationship: senderUser?.patientRelationship
            }),
            createdAt: chat.createdAt,
            status: chat.status,
            metadata: chat.metadata
        })
    };
}

/**
 * Async function to create a push notification payload.
 *
 * @async
 * @param {object} payload - The payload object received.
 * @param {object} payload.senderUser - The user who sends the push notification.
 * @param {object} payload.recipient - Recipient details for the push notification.
 * @param {string} payload.patientId - The patientId associated with the message for the push notification.
 * @param {boolean} payload.isMuted - Flag to determine the notification level.
 * @returns {Promise<*>} - The function returns a Promise that will resolve to the push notification payload.
 * @throws {Error} Will throw an error if `generatePushNotificationPayload` function fails.
 */
async function createPushNotificationPayload(payload) {
    const {senderUser, recipient, patientId, isMuted, badge} = payload;
    const {userId, notificationPlatform, appVersion} = recipient;
    return generatePushNotificationPayload(notificationPlatform, {
        title: PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_TITLE,
        body: template(PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_BODY)({
            firstName: senderUser?.firstName,
            title: senderUser?.title,
            patientRelationship: senderUser?.patientRelationship
        }),
        notificationLevel: isMuted ? MUTE : LOUD,
        type: CHAT,
        sender: {
            firstName: senderUser?.firstName,
            lastName: senderUser?.lastName,
            title: senderUser?.title
        },
        patientId,
        userId,
        appVersion,
        isMuted,
        badge
    });
}

module.exports = {
    queue,
    clearQueue,
    createSubscriptionPayload,
    createPushNotificationPayload
};
