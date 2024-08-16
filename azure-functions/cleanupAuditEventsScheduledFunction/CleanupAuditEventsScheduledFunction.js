const {
        getLogger,
        runWithTransaction,
        CONSTANTS: {
            TENANT_SETTINGS_KEYS: {AUDIT_RETENTION},
            AZURE_MEDIA_CONTAINER_NAME,
            THUMBNAIL_PREFIX
        },
        bootstrapStorageAccount,
        getKeySettings,
        deleteTenantAuditEvents,
        removeAttachmentById,
        getAttachmentsForClosedEncounters,
        bootstrapAzf
    } = require('ohana-shared'),
    sub = require('date-fns/sub');

const logger = getLogger('CleanupAuditEventsScheduledFunction');
let bootstrapped = false;

async function CleanupAuditEventsScheduledFunction() {
    logger.debug('ENTER:CleanupAuditEvents');

    if (!bootstrapped) {
        await bootstrapAzf();
    }

    const tenantSettingsForAuditRetention = await getKeySettings(AUDIT_RETENTION);

    if (tenantSettingsForAuditRetention) {
        for (let i = 0; i < tenantSettingsForAuditRetention.length; i++) {
            const deleteUntil = sub(new Date(), {
                days: parseInt(tenantSettingsForAuditRetention[i].value)
            });
            const closedEncountersAttachments = await getAttachmentsForClosedEncounters({
                tenantId: tenantSettingsForAuditRetention[i].tenantId,
                deleteUntil
            });
            await runWithTransaction(async (dbClient) => {
                if (closedEncountersAttachments) {
                    await Promise.allSettled(
                        closedEncountersAttachments.map(
                            async ({updateId, id, originalFilename, encounterId}) => {
                                const storageAccountClient = bootstrapStorageAccount(
                                    AZURE_MEDIA_CONTAINER_NAME
                                );
                                await storageAccountClient.deleteBlob(
                                    `${encounterId}/${updateId}/${originalFilename}`
                                );
                                await storageAccountClient.deleteBlob(
                                    `${encounterId}/${updateId}/${THUMBNAIL_PREFIX}${originalFilename}`
                                );
                                await removeAttachmentById(id, dbClient);
                            }
                        )
                    );
                }
                await deleteTenantAuditEvents(
                    {
                        tenantId: tenantSettingsForAuditRetention[i].tenantId,
                        deleteUntil
                    },
                    dbClient
                );
            });
        }
    }

    logger.debug('EXIT:CleanupAuditEvents');
}

module.exports = CleanupAuditEventsScheduledFunction;
