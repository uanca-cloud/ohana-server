const {
        bootstrapStorageAccount,
        CONSTANTS: {
            REDIS_COLLECTIONS: {CAREGIVER_UPDATES},
            AZURE_MEDIA_CONTAINER_NAME,
            THUMBNAIL_PREFIX,
            MEDIA_TYPES: {PHOTO},
            VERSION_HEADER_NAME,
            MEDIA_ATTACHMENT_FLAG_DEFAULT,
            TENANT_SETTINGS_KEYS: {MEDIA_ATTACHMENT_FLAG}
        },
        getRedisCollectionData,
        generateThumbnailBuffer,
        createAttachment,
        getMediaAttachment,
        getLogger,
        ltLastSupportedVersion,
        getSession,
        getTenantSetting,
        getPatientByEncounterId
    } = require('ohana-shared'),
    {v4: uuid} = require('uuid');

const logger = getLogger('UpdateMediaAttachmentFunction');

async function updateMediaAttachmentFunction(req, res) {
    logger.debug('ENTER:UpdateMediaAttachment');

    const sessionId = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : null;
    let version = req.headers[VERSION_HEADER_NAME];
    let metadata = {sessionId, version};

    if (ltLastSupportedVersion(version)) {
        logger.error({metadata}, 'Unsupported Version Error');
        return res.code(400).send({
            message: 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR'
        });
    }

    const {method} = req;

    if (method === 'HEAD') {
        logger.debug({metadata}, 'EXIT:UpdateMediaAttachment');
        return res.code(200).send();
    }

    const user = await getSession(sessionId);
    //check for user session
    if (!user) {
        logger.error(metadata, 'User is not authenticated');
        return res.code(403).send('User is not authenticated');
    }

    const {userId, tenantId} = user;

    metadata = {...metadata, userId, tenantId};

    const allowMedia = await getTenantSetting({key: MEDIA_ATTACHMENT_FLAG, tenantId});
    let allowMediaValue = MEDIA_ATTACHMENT_FLAG_DEFAULT;
    if (allowMedia) {
        allowMediaValue = allowMedia.value === 'true';
    }

    if (!allowMediaValue) {
        logger.error(metadata, 'Media attachments not allowed');
        return res.code(409).send({
            message: 'Media attachments not allowed',
            code: 'MEDIA_DISABLED_ERROR'
        });
    }

    let body = null;
    if (req.body?.body) {
        try {
            body = JSON.parse(req.body.body);
        } catch (error) {
            logger.error({error, metadata}, 'Update id and encounter id are missing');
            return res.code(400).send('Update id and encounter id are missing');
        }
    }

    const {encounterId, updateId} = body;
    if (!encounterId || !updateId) {
        logger.error({metadata}, 'Update id and encounter id are missing');
        return res.code(400).send('Update id and encounter id are missing');
    }

    metadata = {...metadata, encounterId, updateId};

    const file = req.file;
    if (!file) {
        logger.error({metadata}, 'Attachment is missing');
        return res.code(400).send('Attachment is missing');
    }

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    if (!update) {
        logger.error({metadata}, 'Invalid update id');
        return res.code(400).send('Invalid update id');
    }

    if (update.encounterId !== encounterId || update.userId !== userId) {
        logger.error({metadata}, 'Invalid encounter id or user id');
        return res.code(400).send('Invalid encounter id or user id');
    }

    const {buffer: attachment, originalname: fileName, mimetype: mimeType} = file;

    const mediaAttachment = await getMediaAttachment({filename: fileName, updateId, type: PHOTO});
    if (mediaAttachment) {
        logger.debug({metadata}, 'EXIT:UpdateMediaAttachment');
        return res.code(200).send(JSON.stringify({id: mediaAttachment.id}));
    }

    const containerClient = bootstrapStorageAccount(AZURE_MEDIA_CONTAINER_NAME);
    const thumbnailBuffer = await generateThumbnailBuffer(attachment);

    const uploadResponse = await Promise.allSettled([
        containerClient.uploadBlockBlob(
            `${encounterId}/${updateId}/${fileName}`,
            attachment,
            Buffer.byteLength(attachment),
            {
                blobHTTPHeaders: {blobContentType: mimeType}
            }
        ),
        containerClient.uploadBlockBlob(
            `${encounterId}/${updateId}/${THUMBNAIL_PREFIX}${fileName}`,
            thumbnailBuffer,
            Buffer.byteLength(thumbnailBuffer),
            {
                blobHTTPHeaders: {blobContentType: mimeType}
            }
        )
    ]);

    const failedUploads = uploadResponse.filter((response) => response.status === 'rejected');
    if (failedUploads.length > 0) {
        logger.error(
            {error: failedUploads[0].reason, metadata},
            'Unexpected Error while uploading to storage.'
        );
        return res.code(500).send('Unexpected Error while uploading to storage.');
    }

    const patient = await getPatientByEncounterId(encounterId);
    if (!patient) {
        logger.error({metadata}, 'Patient is missing from the encounter');
        return res.code(400).send('Patient is missing from the encounter');
    }
    const id = uuid();
    await createAttachment({
        id,
        updateId,
        patientId: patient.id,
        encounterId,
        metadata: {
            originalUrl: `${containerClient.url}/${encounterId}/${updateId}/${fileName}`,
            thumbUrl: `${containerClient.url}/${encounterId}/${updateId}/${THUMBNAIL_PREFIX}${fileName}`,
            filename: fileName
        },
        type: PHOTO
    });

    logger.debug({metadata}, 'EXIT:UpdateMediaAttachment');

    res.code(200).send(JSON.stringify({id}));
}

module.exports = {updateMediaAttachmentFunction};
