const fetch = require('node-fetch'),
    {connect} = require('amqplib'),
    {createPool} = require('../PoolFactory'),
    {
        RMQ_ADMIN_INTEGRATION_RUNNER,
        RMQ_HTTP_API_INTEGRATION_BASE_URL,
        RMQ_HTTP_API_INTEGRATION_CREDENTIALS
    } = require('../constants');

const connectionMap = new Map();

async function createClient(name) {
    let connection = connectionMap.get(name);

    if (!connection) {
        connection = await connect(RMQ_ADMIN_INTEGRATION_RUNNER);
        connectionMap.set(name, connection);
    }

    const channel = await connection.createConfirmChannel();
    channel.on('close', () => {
        channel.restart = true;
    });
    channel.on('error', () => {
        channel.restart = true;
    });
    connection.on('close', () => {
        channel.restart = true;
    });
    connection.on('error', () => {
        channel.restart = true;
    });
    return channel;
}

const createMockPool = (name) => {
    return createPool(
        {
            create: () => createClient(name),
            destroy: async function (channel) {
                return channel.close();
            },
            validate: function (channel) {
                return !channel.restart;
            }
        },
        `rmq-${name}`
    );
};

const teardownConnections = async () => {
    for (const [, connection] of connectionMap) {
        await connection.close();
    }
};

async function createHttpClient() {
    const token = Buffer.from(RMQ_HTTP_API_INTEGRATION_CREDENTIALS).toString('base64');
    return async (method, path = '', headers = {}, bodyParams = null) => {
        const options = {
            method,
            body: bodyParams,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${token}`,
                ...headers
            }
        };
        return fetch(`${RMQ_HTTP_API_INTEGRATION_BASE_URL}${path}`, options);
    };
}

const createHttpMockPool = (name) => {
    return createPool(
        {
            create: createHttpClient,
            destroy: function () {}
        },
        `http-${name}`
    );
};

async function emulateNewMessage(channel, exchangeName, message, routingKey) {
    let {props, payload} = message;

    if (typeof payload === 'object') {
        payload = JSON.stringify(payload);
    }

    await new Promise((resolve, reject) => {
        channel.publish(exchangeName, routingKey, Buffer.from(payload), props, (error, _ok) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    createMockPool,
    createHttpMockPool,
    emulateNewMessage,
    teardownConnections,
    createClient
};
