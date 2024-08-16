const {
    CONSTANTS: {SERVICE_BUS_HEALTH_QUEUE_NAME},
    checkQueueExists,
    createQueue,
    getLogger,
    bootstrapAzureServiceBusAdministratorClient
} = require('ohana-shared');

const logger = getLogger('AzureServiceBusAssertionCommand');

async function assertServiceBusConnection() {
    logger.debug('Checking Service Bus connection');

    const serviceBusAdministratorClient = await bootstrapAzureServiceBusAdministratorClient();
    try {
        await createQueue(serviceBusAdministratorClient, SERVICE_BUS_HEALTH_QUEUE_NAME);
    } catch (error) {
        if (error.code === 'MessageEntityAlreadyExistsError') {
            return true;
        }

        logger.error({error}, 'Error while checking if service bus queue exists.');
        throw(error);
    }

    return checkQueueExists(serviceBusAdministratorClient, SERVICE_BUS_HEALTH_QUEUE_NAME);
}

module.exports = assertServiceBusConnection;
