const {connect} = require('amqplib'),
    {RABBITMQ_MIN_POOL_SIZE, RABBITMQ_MAX_POOL_SIZE} = require('../constants.js'),
    {createPool: genericCreatePool, getPool: genericGetPool} = require('../PoolFactory.js'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('RabbitMQPoolFactory');

// We use only one instance for each connection name
const connectionLookupMap = new Map();
const connectionChannelsLookupMap = new Map();

function generatePoolName(name) {
    return `rmq-${name}`;
}

/**
 * Creates a RabbitMQ connection pool using the generic-pool impl.  This impl use amqp.node channels.
 * @param {string} name - The name of the new pool
 * @param {string} connectionString RabbitMQ connection string
 * @param {number} [minPoolSize] - The minimum size of the created pool.  Optional, uses RMQ_DEFAULT_MIN_POOL_SIZE
 * @param {number} [maxPoolSize] - The maximum size of the created pool. Optional, uses RMQ_DEFAULT_MAX_POOL_SIZE
 */
function createRabbitMQPool(name, connectionString, minPoolSize, maxPoolSize) {
    const generatedName = generatePoolName(name);

    const factory = {
        create: async function () {
            try {
                // get connection, either for creator or publisher
                const channel = await createChannel(name, connectionString);

                const channels = connectionChannelsLookupMap.get(name);
                channels.push(channel);

                return channel;
            } catch (error) {
                logger.error({error}, 'Failed to create RabbitMQ connection!');

                throw error;
            }
        },
        validate: function (channel) {
            return !channel.restart;
        },
        destroy: function (channel) {
            const channels = connectionChannelsLookupMap.get(name);
            const channelIndex = channels.indexOf(channel);
            if (channelIndex !== -1) {
                channels.splice(channelIndex, 1);
            }
            return channel.close();
        }
    };

    minPoolSize = typeof minPoolSize === 'number' ? minPoolSize : RABBITMQ_MIN_POOL_SIZE;
    maxPoolSize = typeof maxPoolSize === 'number' ? maxPoolSize : RABBITMQ_MAX_POOL_SIZE;

    return genericCreatePool(factory, generatedName, {
        minPoolSize,
        maxPoolSize,
        testOnBorrow: true
    });
}

/**
 * Returns the named connection pool
 * @param {string} name - The name of the pool to retrieve
 */
function getRabbitMQPool(name) {
    return genericGetPool(generatePoolName(name));
}

/**
 * Create a confirm channel
 * @param name
 * @param connectionString
 * @returns {Promise<*>}
 */
async function createChannel(name, connectionString) {
    const connection = await getConnection(name, connectionString);

    const channel = await connection.createConfirmChannel();

    channel.on('error', (error) => {
        logger.error({name, error}, 'RabbitMQ channel error event');
        channel.restart = true;
    });

    channel.on('close', (error) => {
        logger.info({name, error}, 'RabbitMQ channel closed');
        channel.restart = true;
    });
    const channels = connectionChannelsLookupMap.get(name);
    channels.push(channel);

    return channel;
}

/**
 * Return the connection either from in-memory cache or a newly created one
 *
 * @param name
 * @param connectionString
 * @returns {Promise<any>}
 */
async function getConnection(name, connectionString) {
    let connection = connectionLookupMap.get(name);

    if (!connection) {
        connection = await connect(connectionString);

        connection.on('error', (error) => {
            logger.error({name, error}, 'RMQ connection error!');
            const channels = connectionChannelsLookupMap.get(name);
            if (channels) {
                channels.forEach((channel) => (channel.restart = true));
            }
            connectionLookupMap.delete(name);
        });

        connection.on('close', (error) => {
            logger.info({name, error}, 'RMQ connection closed.');
            const channels = connectionChannelsLookupMap.get(name);
            if (channels) {
                channels.forEach((channel) => (channel.restart = true));
            }
            connectionLookupMap.delete(name);
        });
        connectionLookupMap.set(name, connection);
        connectionChannelsLookupMap.set(name, []);

        logger.debug({name, connectionCount: connectionLookupMap.size}, 'Created new connection.');
    } else {
        logger.debug({name}, 'Getting connection');
    }

    return connection;
}

/**
 * Close a connection
 *
 * @param name {string}
 * @return {Promise<void>}
 */
async function releaseConnection(name) {
    let connection = connectionLookupMap.get(name);

    if (connection) {
        try {
            await connection.close();
        } catch (error) {
            logger.error(error, 'Error while releasing connection.');
        }

        logger.debug({name, channelCount: connectionLookupMap.size}, 'Released connection.');
    }
}

/**
 * Close all in-memory cached connections
 *
 * @returns {Promise<any>}
 */
function releaseAllConnections() {
    const releasePromises = [...connectionLookupMap.keys()].map((name) => releaseConnection(name));
    return Promise.allSettled(releasePromises);
}

module.exports = {
    createRabbitMQPool,
    getRabbitMQPool,
    releaseAllConnections,
    createChannel
};
