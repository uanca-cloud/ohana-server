const {
    getRedisCollectionData,
    getAttachmentById,
    CONSTANTS: {
        REDIS_COLLECTIONS: {CAREGIVER_UPDATES}
    },
    removalStrategies,
    validateUpdate,
    NotFoundError,
    getLogger
} = require('ohana-shared');

async function RemoveAttachmentOnUpdateResolver(_parent, args, context) {
    const logger = getLogger('RemoveAttachmentOnUpdateResolver', context);
    const {userId} = context;
    const {encounterId, updateId, id} = args.input;
    const metadata = {...logger.bindings()?.metadata, encounterId, updateId, attachmentId: id};

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    validateUpdate(update, encounterId, userId);

    const result = await getAttachmentById(id);
    if (!result) {
        logger.error({metadata}, 'Attachment not found');
        throw new NotFoundError({description: 'Attachment not found'});
    }

    try {
        const removalStrategy = removalStrategies[result.type];
        if (removalStrategy) {
            await removalStrategy({
                id,
                encounterId,
                updateId,
                originalFilename: result.originalFilename
            });
        }
    } catch (error) {
        logger.error({metadata, error});
        return false;
    }

    return true;
}

module.exports = RemoveAttachmentOnUpdateResolver;
