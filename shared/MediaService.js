const Jimp = require('jimp'),
    {
        IMAGE_TYPES,
        THUMBNAIL_HEIGHT,
        MEDIA_TYPES: {PHOTO, TEXT, QUICK_MESSAGE},
        AZURE_MEDIA_CONTAINER_NAME,
        THUMBNAIL_PREFIX,
        THUMBNAIL_COMPRESS_QUALITY
    } = require('./constants'),
    {bootstrapStorageAccount} = require('./AzureStorageAccountGateway'),
    {removeAttachmentById} = require('./updates/AttachmentsDao'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('MediaService');

function getMimeType(buffer) {
    logger.debug('Getting mime type from buffer...');
    const found = Object.keys(IMAGE_TYPES).find((key) => {
        if (key === 'UNKNOWN') {
            logger.info('Image has unknown type...');
            return false;
        }

        const currentType = IMAGE_TYPES[key],
            bytesToRead = currentType.magicNumber.length;

        for (let offset = 0; offset < bytesToRead; offset++) {
            const nextByte = buffer[offset];
            if (nextByte !== currentType.magicNumber[offset]) {
                logger.info('Invalid mime type...');
                return false;
            }
        }

        logger.debug('Mime type retrieved successfully...');
        return true;
    });

    return found ? IMAGE_TYPES[found].mimeType : IMAGE_TYPES.UNKNOWN.mimeType;
}

async function generateThumbnailBuffer(buffer) {
    logger.debug('Generating thumbnail buffer...');
    const JimpFile = await Jimp.read(buffer);

    const originalHeight = JimpFile.bitmap.height;
    if (originalHeight < parseInt(THUMBNAIL_HEIGHT)) {
        return buffer;
    }

    const originalWidth = JimpFile.bitmap.width;
    // compute height maintaining aspect ratio 16:9
    const computedWidth = (originalWidth / originalHeight) * parseInt(THUMBNAIL_HEIGHT);
    // resize the height to 400px and scale the width accordingly
    const thumbnail = JimpFile.resize(computedWidth, parseInt(THUMBNAIL_HEIGHT)).quality(
        THUMBNAIL_COMPRESS_QUALITY
    );
    return thumbnail.getBufferAsync(Jimp.AUTO);
}

async function removeMediaStrategy(attachment) {
    logger.debug('Removing media...');
    const {id, encounterId, updateId, originalFilename} = attachment;

    const storageAccountClient = bootstrapStorageAccount(AZURE_MEDIA_CONTAINER_NAME);
    await Promise.allSettled([
        storageAccountClient.deleteBlob(`${encounterId}/${updateId}/${originalFilename}`),
        storageAccountClient.deleteBlob(
            `${encounterId}/${updateId}/${THUMBNAIL_PREFIX}${originalFilename}`
        )
    ]);

    logger.debug('Blob deleted successfully...');

    return removeAttachmentById(id);
}

async function removeTextStrategy(attachment) {
    logger.debug('Removing text...');
    return removeAttachmentById(attachment.id);
}

const removalStrategies = {
    [`${PHOTO}`]: removeMediaStrategy,
    [`${TEXT}`]: removeTextStrategy,
    [`${QUICK_MESSAGE}`]: removeTextStrategy
};

module.exports = {getMimeType, generateThumbnailBuffer, removalStrategies};
