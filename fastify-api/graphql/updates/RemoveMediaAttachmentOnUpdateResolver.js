const {
    getRedisCollectionData,
    getMediaAttachment,
    CONSTANTS: {
        REDIS_COLLECTIONS: {CAREGIVER_UPDATES},
        MEDIA_TYPES: {PHOTO}
    },
    removalStrategies,
    validateUpdate,
    NotFoundError,
    getLogger
} = require('ohana-shared');

async function RemoveMediaAttachmentOnUpdateResolver(_parent, args, context) {
    const logger = getLogger('RemoveMediaAttachmentOnUpdateResolver', context);
    const {userId} = context;
    const {encounterId, updateId, filename} = args.input;
    const metadata = {...logger.bindings()?.metadata, encounterId, updateId};

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    validateUpdate(update, encounterId, userId);

    const result = await getMediaAttachment({filename, updateId, type: PHOTO});
    if (!result) {
        logger.error({metadata}, 'Attachment not found');
        throw new NotFoundError({description: 'Attachment not found'});
    }

    try {
        const removalStrategy = removalStrategies[result.type];
        if (removalStrategy) {
            await removalStrategy({
                id: result.id,
                encounterId,
                updateId,
                originalFilename: filename
            });
        }
    } catch (error) {
        logger.error({metadata, error});
        return false;
    }

    return true;
}

module.exports = RemoveMediaAttachmentOnUpdateResolver;
