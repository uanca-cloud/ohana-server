const {getDatabasePool} = require('../DatabasePoolFactory'),
    {createAttachmentsTemplate} = require('../EntitiesFactory'),
    {
        DB_CONNECTION_POOLS,
        ATTACHMENTS_BASE_URL,
        MEDIA_TYPES: {QUICK_MESSAGE, PHOTO, USER_JOIN, TEXT}
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('AttachmentsDao');

/**
 * @typedef {Object} Attachments
 * @property {string} id
 * @property {string} updateId
 * @property {string} encounterId
 * @property {json} metadata
 * @property {string} type
 */

async function createAttachment(attachment) {
    logger.debug('Creating an attachment...');
    const {id, updateId, patientId, metadata, type, encounterId} = attachment;
    const insertQueryText = `
        INSERT INTO attachments (
            id, update_id, patient_id, metadata, type, encounter_id
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return pool.query(insertQueryText, [
        id,
        updateId,
        patientId,
        JSON.stringify(metadata),
        type,
        encounterId
    ]);
}

async function getAttachmentsByUpdateId(updateId) {
    logger.debug('Getting attachments by update id...');
    const selectQueryText = `
       SELECT id, metadata, type FROM attachments WHERE update_id = $1;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(selectQueryText, [updateId]);

    if (!results.rowCount) {
        logger.info({metadata: {updateId}}, 'No attachments were found');
        return [];
    }

    return results.rows.map((result) => {
        const jsonMetadata = JSON.parse(JSON.stringify(result.metadata));
        return createAttachmentsTemplate({
            id: result.id,
            updateId: updateId,
            thumbUrl:
                result.type === PHOTO ? `${ATTACHMENTS_BASE_URL}${result.id}/thumbnail` : null,
            originalUrl: result.type === PHOTO ? `${ATTACHMENTS_BASE_URL}${result.id}` : null,
            originalFilename: result.type === PHOTO ? jsonMetadata.filename : null,
            type: result.type,
            quickMessages: result.type === QUICK_MESSAGE ? jsonMetadata : [],
            translations: result.type === TEXT ? jsonMetadata : [],
            invitedByFirstName: result.type === USER_JOIN ? jsonMetadata?.invitedByFirstName : '',
            invitedByLastName: result.type === USER_JOIN ? jsonMetadata?.invitedByLastName : '',
            invitedByUserType: result.type === USER_JOIN ? jsonMetadata?.invitedByUserType : '',
            inviteeName: result.type === USER_JOIN ? jsonMetadata?.inviteeName : '',
            inviteeRelationship: result.type === USER_JOIN ? jsonMetadata?.inviteeRelationship : ''
        });
    });
}

async function getAttachmentById(id) {
    logger.debug('Getting attachment by id...');
    const selectQueryText = `
       SELECT metadata, type, update_id FROM attachments WHERE id = $1;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQueryText, [id]);

    if (!result.rowCount) {
        logger.info({metadata: {attachmentId: id}}, 'No attachment was found');
        return null;
    }

    const jsonMetadata = JSON.parse(JSON.stringify(result.rows[0].metadata));
    return createAttachmentsTemplate({
        id,
        updateId: result.rows[0].update_id,
        thumbUrl: result.rows[0].type === PHOTO ? `${ATTACHMENTS_BASE_URL}${id}/thumbnail` : null,
        originalUrl: result.rows[0].type === PHOTO ? `${ATTACHMENTS_BASE_URL}${id}` : null,
        originalFilename: result.rows[0].type === PHOTO ? jsonMetadata.filename : null,
        type: result.rows[0].type,
        quickMessages: result.rows[0].type === QUICK_MESSAGE ? jsonMetadata : []
    });
}

async function removeAttachmentById(id, dbClient) {
    logger.debug('Removing attachment by id...');
    const deleteQueryText = `
       DELETE FROM attachments WHERE id = $1;
    `;
    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return pool.query(deleteQueryText, [id]);
}

async function getCommittedAttachmentById(id) {
    logger.debug('Getting committed attachment by id...');
    const selectQueryText = `
        SELECT 
            e.id as encounter_id, 
            uma.patient_id, 
            uma.metadata, 
            uma.update_id, 
            uma.type 
        FROM attachments uma
        INNER JOIN encounters e on e.id = uma.encounter_id
        WHERE uma.id = $1 AND e.ended_at is null;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQueryText, [id]);

    if (!result.rowCount) {
        logger.info({metadata: {attachmentId: id}}, 'No committed attachment was found');
        return null;
    }

    const attachment = result.rows[0];

    const jsonMetadata = JSON.parse(JSON.stringify(attachment.metadata));
    return createAttachmentsTemplate({
        encounterId: attachment.encounter_id,
        patientId: attachment.patient_id,
        updateId: attachment.update_id,
        thumbUrl: jsonMetadata.thumbUrl,
        originalUrl: jsonMetadata.originalUrl,
        originalFilename: jsonMetadata.filename,
        type: attachment.type
    });
}

async function getUncommittedAttachments() {
    logger.debug('Getting the uncommitted attachments...');
    const selectQueryText = `
         SELECT update_id, a.id, e.id as encounter_id, metadata, type
         FROM attachments a
         INNER JOIN encounters e on e.patient_id = a.patient_id
         WHERE update_id NOT IN (SELECT id FROM updates);
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQueryText);

    if (!result.rowCount) {
        logger.info('No uncommitted attachments were found');
        return null;
    }

    return result.rows.map((res) => {
        const jsonMetadata = JSON.parse(JSON.stringify(res.metadata));
        return {
            id: res.id,
            encounterId: res.encounter_id,
            updateId: res.update_id,
            originalFilename: jsonMetadata.filename,
            type: res.type
        };
    });
}

async function getMediaAttachment(attachment) {
    logger.debug('Getting media attachment...');
    const {filename, updateId, type} = attachment;
    const selectQueryText = `
       SELECT id, type FROM attachments WHERE metadata->'filename' ? $1 AND update_id = $2 and type = $3;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQueryText, [filename, updateId, type]);

    if (!result.rowCount) {
        logger.info({metadata: {updateId, type}}, 'No media attachment was found');
        return null;
    }

    return createAttachmentsTemplate({
        id: result.rows[0].id,
        type: result.rows[0].type
    });
}

async function getAttachmentsForClosedEncounters({tenantId, deleteUntil}) {
    logger.info('Getting attachments for closed encounters...');
    const selectQueryText = `
        SELECT audit_events.id as audit_event_id, attachments.update_id, attachments.id, encounters.id as encounter_id, attachments.metadata
        FROM attachments
        LEFT JOIN encounters on attachments.patient_id = encounters.patient_id
        LEFT JOIN audit_events on attachments.update_id = audit_events.update_id
        WHERE encounters.ended_at is not null AND audit_events.tenant_id = $1 AND audit_events.created_at <= $2
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQueryText, [tenantId, deleteUntil]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId}}, 'No attachments were found');
        return null;
    }

    return result.rows.map((row) => {
        const jsonMetadata = JSON.parse(JSON.stringify(row.metadata));
        return {
            id: row.id,
            encounterId: row.encounter_id,
            updateId: row.update_id,
            originalFilename: jsonMetadata.filename
        };
    });
}

async function getAttachmentsByUpdateIds(updateIds) {
    logger.info('Getting bulk attachments by update ids...');
    const selectQueryText = `
       SELECT
            a.id,
            metadata,
            type,
            encounter_id,
            update_id
        FROM attachments a
        WHERE update_id = ANY($1);
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(selectQueryText, [updateIds]);

    if (!results.rowCount) {
        logger.info({metadata: {updateIds}}, 'No attachments were found');
        return [];
    }

    return results.rows.map((res) => {
        const jsonMetadata = JSON.parse(JSON.stringify(res.metadata));
        return createAttachmentsTemplate({
            id: res.id,
            encounterId: res.encounter_id,
            updateId: res.update_id,
            thumbUrl: res.type === PHOTO ? `${ATTACHMENTS_BASE_URL}${res.id}/thumbnail` : null,
            originalUrl: res.type === PHOTO ? `${ATTACHMENTS_BASE_URL}${res.id}` : null,
            originalFilename: res.type === PHOTO ? jsonMetadata.filename : null,
            type: res.type,
            quickMessages: res.type === QUICK_MESSAGE ? jsonMetadata : [],
            translations: res.type === TEXT ? jsonMetadata : []
        });
    });
}

async function removeUserJoinAttachmentByUserIds(userIds, dbClient) {
    logger.info('Removing user join attachment by user id...');
    const deleteAttachmentsQueryText = `
          DELETE FROM attachments
            USING updates
            WHERE attachments.update_id = updates.id AND attachments.type = $1
            AND updates.user_id = ANY($2)
            RETURNING updates.id;
    `;
    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await pool.query(deleteAttachmentsQueryText, [USER_JOIN, userIds]);

    if (!result.rowCount) {
        logger.info({metadata: {userIds}}, 'No attachments found');
        return null;
    } else {
        return result.rows.map((row) => row.id);
    }
}

async function removeUserJoinAttachmentsByPatientId(patientId, dbClient) {
    logger.info('Removing user join attachment by patient ids...');
    const query = `
        DELETE FROM attachments
        USING updates
        WHERE attachments.update_id = updates.id
            AND attachments.type = $2
            AND updates.patient_id = $1
        RETURNING updates.id;
    `;

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [patientId, USER_JOIN]);
    return result.rows.map((row) => row.id);
}

module.exports = {
    createAttachment,
    getAttachmentsByUpdateId,
    removeAttachmentById,
    getAttachmentById,
    getCommittedAttachmentById,
    getUncommittedAttachments,
    getMediaAttachment,
    getAttachmentsForClosedEncounters,
    getAttachmentsByUpdateIds,
    removeUserJoinAttachmentByUserIds,
    removeUserJoinAttachmentsByPatientId
};
