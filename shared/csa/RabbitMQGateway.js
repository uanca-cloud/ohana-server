const {createRabbitMQPool, createChannel} = require('./RabbitMQPoolFactory'),
    {
        RABBITMQ_CONNECTION_POOLS,
        RABBITMQ_DEFAULT_EXCHANGE,
        RABBITMQ_DEFAULT_QUEUE,
        RABBITMQ_CONNECTION_STRING_CONSUMER,
        RABBITMQ_CONSUMER_NAME
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    {handler: defaultSubscriptionHandler} = require('./DefaultSubscriptionHandler');

const logger = getLogger('RabbitMQGateway');
const receivedTimeoutIds = new Set();

const consumerMap = new Map();

/**
 * Registers consumer for the CSA RMQ federation
 * @param queueName
 * @param handlerFn
 * @returns {Promise<void>}
 */
async function registerConsumer(queueName, handlerFn = defaultSubscriptionHandler) {
    const startTime = Date.now();
    try {
        const consumer = getConsumer(queueName);

        if (!consumer) {
            const channel = await createChannel(
                RABBITMQ_CONSUMER_NAME,
                RABBITMQ_CONNECTION_STRING_CONSUMER
            );

            channel.prefetch(100);
            channel.consume(
                queueName,
                (msg) => {
                    const timeoutId = setTimeout(() => {
                        (async () => {
                            await handlerFn(msg, channel);

                            clearInterval(timeoutId);
                            receivedTimeoutIds.delete(timeoutId);
                        })();
                    }, 0);

                    receivedTimeoutIds.add(timeoutId);
                },
                {noAck: false}
            );
            consumerMap.set(queueName, channel);
            logger.info({metadata: {duration: Date.now() - startTime}}, 'Consumer registered');
        }
    } catch (error) {
        logger.error(
            {error, metadata: {duration: Date.now() - startTime}},
            'Failed to register consumer'
        );
        throw error;
    }
}

async function assertMainExchangeAndQueue() {
    const startTime = Date.now();
    const pool = createRabbitMQPool(RABBITMQ_CONNECTION_POOLS.INFRA);
    const channel = await pool.acquire();

    await channel.assertExchange(RABBITMQ_DEFAULT_EXCHANGE, 'topic', {durable: true});
    await channel.assertQueue(RABBITMQ_DEFAULT_QUEUE, {
        durable: true,
        arguments: {'x-queue-type': 'quorum'}
    });
    await channel.bindQueue(RABBITMQ_DEFAULT_QUEUE, RABBITMQ_DEFAULT_EXCHANGE, `#`);

    logger.info({metadata: {duration: Date.now() - startTime}}, 'Main queue and exchange asserted');

    await pool.release(channel);
}

function getConsumer(queueName) {
    return consumerMap.get(queueName);
}

async function unregisterConsumer(queueName) {
    const consumer = getConsumer(queueName);
    if (!consumer) {
        return new Error('No consumer for this queue');
    }

    await consumer.close();

    consumerMap.delete(queueName);
}

function teardownUnprocessedQueuedMessages() {
    for (let timeoutId of receivedTimeoutIds.values()) {
        clearTimeout(timeoutId);
    }
}

/**
 * Only useful for handling the refactoring of watchChannel to watchChat as the main terminology
 * @returns {Promise<void>}
 */
async function cleanupOutdatedExchange() {
    const pool = createRabbitMQPool(RABBITMQ_CONNECTION_POOLS.INFRA);
    const channel = await pool.acquire();

    await channel.deleteExchange('csa-watchChannel');
    await channel.deleteQueue('ohana.csa-watchChannel');

    await pool.release(channel);
}

module.exports = {
    registerConsumer,
    getConsumer,
    assertMainExchangeAndQueue,
    unregisterConsumer,
    teardownUnprocessedQueuedMessages,
    cleanupOutdatedExchange
};
