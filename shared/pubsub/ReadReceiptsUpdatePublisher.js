const {RedisPubSub} = require('graphql-redis-subscriptions'),
    {
        SUBSCRIPTION_TOPICS: {READ_RECEIPTS},
        CHAT_UPDATE_TYPES: {READ_RECEIPT_UPDATE},
        REDIS_CONNECTION_STRING
    } = require('../constants'),
    {updateChatCountForPatient} = require('../SessionService'),
    {getDeviceIdsFromUserIds} = require('../device/DeviceInfoDao'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('ReadReceiptsUpdatePublisher');
const pubSub = new RedisPubSub({connection: REDIS_CONNECTION_STRING});

function getReadReceiptsAsyncIterator(deviceId) {
    return pubSub.asyncIterator(`${READ_RECEIPTS}-${deviceId}`);
}

async function publishChatReadReceipt(patientId, orderNumber, recipientIds) {
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

    await Promise.all(
        userDeviceInfos.map((userDeviceInfo) => {
            try {
                logger.debug(
                    {metadata: {userId: userDeviceInfo.userId, deviceId: userDeviceInfo.deviceId}},
                    'Sending message through pubsub connection'
                );

                const payload = {
                    ...subscriptionPayload,
                    unreadChatMessageCount: userChatCounts[userDeviceInfo.userId]
                };
                pubSub.publish(`${READ_RECEIPTS}-${userDeviceInfo.deviceId}`, payload);
            } catch (error) {
                logger.error({error}, 'Error publishing read receipts to pubsub:');
            }
        })
    );
}

module.exports = {
    getReadReceiptsAsyncIterator,
    publishChatReadReceipt
};
