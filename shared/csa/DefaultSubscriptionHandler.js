const {getLogger} = require('../logs/LoggingService'),
    {newMessageRabbitMQHandler} = require('../chat/NewMessageRabbitMQHandler'),
    {readReceiptsRabbitMQHandler} = require('../chat/ReadReceiptsRabbitMQHandler');

const logger = getLogger('DefaultSubscriptionHandler');

/**
 * Handles RabbitMQ message consumption. Will always acknowledge the received message to avoid getting spammed with retries from the federated RMQ broker
 * @param message - RabbitMQ message
 * @param channel - RabbitMQ channel
 * @returns {Promise<void>}
 */
async function handler(message, channel) {
    try {
        const {routingKey} = message.fields;
        const fieldName = routingKey.split('.').pop();
        logger.debug('Message received on RMQ');

        switch (fieldName) {
            case 'watchChannel': {
                logger.debug('New message on watchChannel queue');
                const content = Buffer.from(message?.content).toString();
                if (!content) {
                    logger.warn('Missing content payload from watchChannel message');
                }

                const payload = JSON.parse(content);

                // here we are handling only messages published for new messages, not for add/remove members
                if (payload?.data?.watchChannel?.chat) {
                    logger.debug(
                        {
                            metadata: {
                                orderNumber: payload?.data?.watchChannel?.chat?.order,
                                tenantId: payload?.data?.watchChannel?.tenantId,
                                recipientIds: payload?.data?.watchChannel?.recipients
                            }
                        },
                        'New chat message received'
                    );
                    await newMessageRabbitMQHandler(payload.data.watchChannel);
                }
                break;
            }
            case 'watchReadReceipt': {
                logger.debug('New message on watchReadReceipt queue');
                const content = Buffer.from(message?.content).toString();
                if (!content) {
                    logger.warn('Missing content payload from watchReadReceipt message');
                }

                const payload = JSON.parse(content);

                // here we are handling only messages published for read receipts
                if (payload?.data?.watchReadReceipt) {
                    logger.debug(
                        {
                            metadata: {
                                orderNumber: payload?.data?.watchReadReceipt?.orderNumber,
                                patientUlid: payload?.data?.watchReadReceipt?.seed,
                                recipientIds: payload?.data?.watchReadReceipt?.recipients
                            }
                        },
                        'New read receipt received'
                    );
                    await readReceiptsRabbitMQHandler(payload.data.watchReadReceipt);
                }
                break;
            }
            default: {
                logger.warn(
                    {metadata: {fieldName, type: message?.properties?.type}},
                    'RabbitMQ message received with default handler.  No implementation found!'
                );
            }
        }
    } catch (error) {
        logger.error({error}, 'Failed to parse received RabbitMQ message');
    } finally {
        channel.ack(message);
    }
}

module.exports = {handler};
