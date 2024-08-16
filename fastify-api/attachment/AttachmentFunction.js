const {
    CONSTANTS: {
        AZURE_MEDIA_CONTAINER_NAME,
        THUMBNAIL_PREFIX,
        VERSION_HEADER_NAME,
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER}
    },
    getBlobTempPublicUrl,
    getCommittedAttachmentById,
    getLogger,
    ltLastSupportedVersion,
    getSession
} = require('ohana-shared');

const logger = getLogger('AttachmentFunction');

async function attachmentFunction(req, res) {
    logger.debug('ENTER:Attachment');

    const sessionId = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : null;
    let version = req.headers[VERSION_HEADER_NAME];
    const metadata = {sessionId, version};

    if (ltLastSupportedVersion(version)) {
        logger.error({metadata}, 'Unsupported Version Error');
        return res.code(400).send({
            message: 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR'
        });
    }

    const {method} = req;
    if (method === 'HEAD') {
        logger.debug({metadata}, 'EXIT:Attachment');
        return res.code(200).send();
    }

    const {id, thumbnail} = req.params;
    const user = await getSession(sessionId);

    //check for user session
    if (!user) {
        logger.error({metadata}, 'User is not authenticated');
        return res.code(403).send('User is not authenticated');
    }

    const {role} = user;
    if (role !== CAREGIVER && role !== FAMILY_MEMBER) {
        logger.error({metadata}, 'User is not allowed to perform this action');
        return res.code(403).send('User is not allowed to perform this action');
    }

    const attachment = await getCommittedAttachmentById(id);
    if (!attachment) {
        logger.error({metadata}, 'Attachment not found');
        return res.code(403).send('Attachment not found');
    }

    const filename = thumbnail
        ? `${THUMBNAIL_PREFIX}${attachment.originalFilename}`
        : attachment.originalFilename;
    const temporaryToken = await getBlobTempPublicUrl(
        AZURE_MEDIA_CONTAINER_NAME,
        `${attachment.encounterId}/${attachment.updateId}/${filename}`
    );
    const location = thumbnail
        ? `${attachment.thumbUrl}?${temporaryToken}`
        : `${attachment.originalUrl}?${temporaryToken}`;

    logger.debug({metadata}, 'EXIT:Attachment');
    res.code(301).redirect(301, location);
}

module.exports = {attachmentFunction};
