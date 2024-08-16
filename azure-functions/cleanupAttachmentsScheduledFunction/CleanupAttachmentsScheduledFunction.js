const {
    getLogger,
    getRedisCollectionData,
    CONSTANTS: {
        REDIS_COLLECTIONS: {CAREGIVER_UPDATES}
    },
    removalStrategies,
    getUncommittedAttachments,
    bootstrapAzf
} = require('ohana-shared');

const logger = getLogger('CleanupAttachmentsScheduledFunction');
let bootstrapped = false;

async function CleanupAttachmentsScheduledFunction() {
    logger.debug('ENTER:CleanupAttachments');

    if (!bootstrapped) {
        await bootstrapAzf();
    }

    const uncommittedAttachments = await getUncommittedAttachments();

    if (uncommittedAttachments) {
        await Promise.allSettled(
            uncommittedAttachments.map(
                async ({updateId, id, originalFilename, encounterId, type}) => {
                    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
                    if (!update) {
                        const removalStrategy = removalStrategies[type];
                        if (removalStrategy) {
                            removalStrategy({id, encounterId, updateId, originalFilename});
                        }
                    }
                }
            )
        );
    }
    logger.debug('EXIT:CleanupAttachments');
}

module.exports = CleanupAttachmentsScheduledFunction;
