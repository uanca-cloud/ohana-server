const {
    CONSTANTS: {RABBITMQ_CONNECTION_POOLS, RABBITMQ_DEFAULT_EXCHANGE},
    getRabbitMQPool,
    getLogger
} = require('ohana-shared');

const logger = getLogger('RabbitmqAmqAssertionCommand');

async function assertRabbitmqAmqpConnection() {
    logger.debug('Checking RabbitmqAmq connection');

    const pool = await getRabbitMQPool(RABBITMQ_CONNECTION_POOLS.HEALTH);
    const channel = await pool.acquire();

    try {
        await channel.checkExchange(RABBITMQ_DEFAULT_EXCHANGE);
        return {isUp: true};
    } catch (error) {
        logger.error({error}, 'Failed to check RMQ connection');
        throw error;
    } finally {
        pool.release(channel);
    }
}

module.exports = assertRabbitmqAmqpConnection;
