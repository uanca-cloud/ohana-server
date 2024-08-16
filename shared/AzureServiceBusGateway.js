const {getLogger} = require('./logs/LoggingService'),
    {ServiceBusClient, ServiceBusAdministrationClient} = require('@azure/service-bus');

const logger = getLogger('AzureServiceBusGateway');

/**
 *
 * @param serviceBusClient
 * @param queueName String
 * @param message String
 * @returns {Promise<Boolean>}
 */
async function pushMessageInQueue(serviceBusClient, queueName, message) {
    logger.debug('Pushing message to queue..');
    const sender = serviceBusClient.createSender(queueName);

    try {
        await sender.sendMessages({
            body: message,
            contentType: 'application/json;charset=utf-8'
        });
        logger.debug('message pushed to queue successfully.');

        await sender.close();
    } catch (error) {
        logger.error({error}, 'Failed to send message to service bus');
    }
}

/**
 *
 * @returns {Promise<ServiceBusClient>}
 */
function bootstrapAzureServiceBusClient() {
    return new ServiceBusClient(process.env.ServiceBusConnection);
}

/**
 *
 * @returns {Promise<ServiceBusAdministrationClient>}
 */
function bootstrapAzureServiceBusAdministratorClient() {
    return new ServiceBusAdministrationClient(process.env.ServiceBusConnection);
}

/**
 *
 * @returns {ServiceBusSender}
 */
function getAzureServiceBusSender(serviceBusClient, queueName) {
    return serviceBusClient.createSender(queueName);
}

/**
 *
 * @param serviceBusAdministratorClient ServiceBusAdministratorClient
 * @param queueName String
 * @returns {Promise<Boolean>}
 */
async function checkQueueExists(serviceBusAdministratorClient, queueName) {
    if (!(await serviceBusAdministratorClient.queueExists(queueName))) {
        logger.error({error: {message: 'Queue does not exist!'}}, 'Queue does not exist!');
        throw new Error('Queue does not exist!');
    }

    return true;
}

/**
 *
 * @param serviceBusAdministratorClient ServiceBusAdministratorClient
 * @param queueName String
 * @returns {Promise<any>}
 */
async function createQueue(serviceBusAdministratorClient, queueName) {
    await serviceBusAdministratorClient.createQueue(queueName);
}

module.exports = {
    createQueue,
    pushMessageInQueue,
    bootstrapAzureServiceBusClient,
    getAzureServiceBusSender,
    checkQueueExists,
    bootstrapAzureServiceBusAdministratorClient
};
