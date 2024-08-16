const {WebPubSubServiceClient} = require('@azure/web-pubsub'),
    {
        WEB_PUBSUB_CONNECTION_STRING,
        WEB_PUBSUB_HUB_NAME,
        WEB_PUBSUB_TOKEN_VALIDITY_IN_MINS
    } = require('../constants');

const pubSubService = new WebPubSubServiceClient(WEB_PUBSUB_CONNECTION_STRING, WEB_PUBSUB_HUB_NAME);

/**
 * Initialize the websocket server
 * Provide a groupId and user identity - these are equivalent in our system to the userId and deviceId
 * @param groupId
 * @param identity
 * @returns {Promise<*>}
 */
async function generateUrl(groupId, identity) {
    const token = await pubSubService.getClientAccessToken({
        userId: identity,
        groups: [groupId],
        roles: [`webpubsub.joinLeaveGroup.${groupId}`, `webpubsub.sendToGroup.${groupId}`],
        expirationTimeInMinutes: WEB_PUBSUB_TOKEN_VALIDITY_IN_MINS
    });
    return token.url;
}

/**
 *
 * @param connectionId
 * @param eventData
 * @returns {Promise<*>}
 */
async function sendToConnection(connectionId, eventData) {
    return pubSubService.sendToConnection(connectionId, eventData, {contentType: 'text/plain'});
}

/**
 * Check if an active connection exists
 * @param identity
 * @returns {Promise<*>}
 */
async function hasPubSubConnection(identity) {
    return pubSubService.userExists(identity);
}

/**
 *
 * @param userId
 * @returns {Promise<*>}
 */
async function removeUserFromGroups(userId) {
    return pubSubService.removeUserFromAllGroups(userId);
}

/**
 *
 * @param connectionId
 * @returns {Promise<void>}
 */
async function removeConnectionFromGroups(connectionId) {
    await pubSubService.removeConnectionFromAllGroups(connectionId);
}

/**
 *
 * @param connectionId
 * @param reason
 * @returns {Promise<void>}
 */
async function closeConnection(connectionId, reason) {
    await pubSubService.closeConnection(connectionId, {reason});
}

module.exports = {
    generateUrl,
    sendToConnection,
    hasPubSubConnection,
    removeConnectionFromGroups,
    removeUserFromGroups,
    closeConnection
};
