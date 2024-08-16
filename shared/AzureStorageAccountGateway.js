const {
        BlobServiceClient,
        generateBlobSASQueryParameters,
        BlobSASPermissions,
        StorageSharedKeyCredential
    } = require('@azure/storage-blob'),
    {
        AZURE_STORAGE_ACCOUNT_CONNECTION_STRING,
        AZURE_STORAGE_ACCOUNT_KEY,
        AZURE_STORAGE_ACCOUNT_NAME,
        TEMPORARY_TOKEN_TTL_IN_SECS
    } = require('./constants'),
    {addSeconds} = require('date-fns'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('AzureStorageAccountGateway');

function bootstrapStorageAccount(containerName) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
        AZURE_STORAGE_ACCOUNT_CONNECTION_STRING
    );
    return blobServiceClient.getContainerClient(containerName);
}

async function getBlobTempPublicUrl(containerName, blobName) {
    logger.debug('Getting temporary blob from public url...');
    const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY
    );

    return generateBlobSASQueryParameters(
        {
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse('r'), // only read permissions
            startsOn: new Date(),
            expiresOn: addSeconds(new Date(), TEMPORARY_TOKEN_TTL_IN_SECS)
        },
        sharedKeyCredential
    ).toString();
}

module.exports = {bootstrapStorageAccount, getBlobTempPublicUrl};
