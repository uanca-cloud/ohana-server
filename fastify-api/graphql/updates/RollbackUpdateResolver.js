const {
    CONSTANTS: {
        REDIS_COLLECTIONS: {CAREGIVER_UPDATES}
    },
    getRedisCollectionData,
    delRedisCollectionData,
    removalStrategies,
    getAttachmentsByUpdateId,
    validateUpdate
} = require('ohana-shared');

async function RollbackUpdateResolver(_parent, args, {userId}) {
    const {encounterId, updateId} = args;

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    validateUpdate(update, encounterId, userId);

    const results = await getAttachmentsByUpdateId(updateId);
    if (results.length) {
        await Promise.allSettled(
            results.map((result) => {
                const removalStrategy = removalStrategies[result.type];
                if (removalStrategy) {
                    removalStrategy({
                        id: result.id,
                        encounterId,
                        updateId,
                        originalFilename: result.originalFilename
                    });
                }
            })
        );
    }

    return delRedisCollectionData(CAREGIVER_UPDATES, updateId);
}

module.exports = RollbackUpdateResolver;
