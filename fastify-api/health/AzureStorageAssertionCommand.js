const {
    CONSTANTS: {AZURE_MEDIA_CONTAINER_NAME},
    bootstrapStorageAccount,
    getLogger
} = require('ohana-shared');

const storageAccountClient = bootstrapStorageAccount(AZURE_MEDIA_CONTAINER_NAME),
    logger = getLogger('AzureStorageAssertionCommand');

async function assertAzureStorageConnection() {
    logger.debug('Checking Azure Storage connection');

    try {
        const accessPolicy = await storageAccountClient.getAccessPolicy();
        if (accessPolicy) {
            return true;
        } else {
            throw new Error('Failed to connect to storage');
        }
    } catch (error) {
        logger.error({error}, 'Unknown error occurred while connecting to storage');
        throw error;
    }
}

module.exports = assertAzureStorageConnection;
