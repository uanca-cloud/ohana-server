const {
    getLogger,
    CONSTANTS: {AZURE_AUDIT_CONTAINER_NAME},
    getAuditReportsAssets,
    bootstrapStorageAccount,
    bootstrapAzf
} = require('ohana-shared');

const logger = getLogger('CleanupAuditAttachmentsScheduledFunction');
let bootstrapped = false;

async function CleanupAuditAttachmentsScheduledFunction() {
    logger.debug('ENTER:CleanupAuditAttachments');

    if (!bootstrapped) {
        await bootstrapAzf();
    }
    const storageAccountClient = bootstrapStorageAccount(AZURE_AUDIT_CONTAINER_NAME);
    const necessaryAssets = await getAuditReportsAssets();

    const allAzureAuditAssets = [];

    for await (const blob of storageAccountClient.listBlobsFlat()) {
        allAzureAuditAssets.push(blob.name);
    }
    let redundantAssets = allAzureAuditAssets.filter((x) => !necessaryAssets.includes(x));
    for (let i = 0; i < redundantAssets; i++) {
        await storageAccountClient.deleteBlob(redundantAssets[i]);
    }

    logger.debug('EXIT:CleanupAuditAttachmentsScheduledFunction');
}

module.exports = CleanupAuditAttachmentsScheduledFunction;
