const {getDatabasePool} = require('../DatabasePoolFactory'),
    {runWithTransaction} = require('../DaoHelper'),
    {updateEncounters} = require('../patient/EncounterDao'),
    {
        DB_CONNECTION_POOLS,
        PG_INSERT_BATCH_SIZE,
        OHANA_ROLES: {FAMILY_MEMBER, CAREGIVER}
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    chunk = require('lodash.chunk'),
    {createReadReceiptTemplate, createUserTemplate} = require('../EntitiesFactory');

const logger = getLogger('UpdatesDao');

async function createUpdate(update) {
    logger.info('Creating an update...');
    const {userId, updateId, text, patientId, encounterId} = update;
    const insertUpdateQuery = `
            INSERT INTO updates (
                id,
                user_id,
                message,
                created_at,
                patient_id,
                encounter_id
            ) VALUES($1, $2, $3, $4, $5, $6) RETURNING created_at;`;

    let result = null;

    await runWithTransaction(async (dbClient) => {
        await updateEncounters({patientId}, dbClient);
        result = await dbClient.query(insertUpdateQuery, [
            updateId,
            userId,
            text,
            new Date(),
            patientId,
            encounterId
        ]);
    });

    return result;
}

async function getUpdatesByPatientId(patientId) {
    logger.debug('Getting updates by patient id...');
    const query = `
        SELECT
            updates.id,
            updates.message, 
            updates.created_at,
            updates.read,
            users.user_id,
            users.tenant_id,
            users.assigned_roles,
            users.first_name,
            users.last_name,
            users.title,
            users.last_eula_acceptance_timestamp,
            urr.read_at,
            urr.user_id as read_by,
            a.id as attachment_id,
            a.update_id,
            a.type,
            a.metadata
        FROM updates 
        LEFT JOIN users ON updates.user_id = users.user_id 
        LEFT JOIN patients ON patients.id = updates.patient_id
        LEFT JOIN encounters e ON e.id = updates.encounter_id
        LEFT JOIN updates_read_receipts urr ON updates.id = urr.update_id
        LEFT JOIN attachments a ON updates.id = a.update_id
        WHERE updates.patient_id = $1
            AND e.ended_at IS NULL;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [patientId]);

    if (!result.rowCount) {
        logger.info({metadata: {patientId}}, 'No updates were found');
        return [];
    }

    return result.rows;
}

async function getUpdateByUpdateIds(updateIds, userId) {
    const query = `
        SELECT
            updates.id,
            updates.message as text, 
            updates.created_at,
            updates.read,
            users.user_id,
            users.tenant_id,
            users.assigned_roles,
            users.first_name,
            users.last_name,
            users.title,
            users.last_eula_acceptance_timestamp
        FROM updates 
        LEFT JOIN users ON updates.user_id = users.user_id 
        LEFT JOIN encounters e ON e.patient_id = updates.patient_id
        WHERE updates.id = ANY($1)
            AND updates.user_id != $2
            AND e.ended_at IS NULL;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [updateIds, userId]);

    if (!result.rowCount) {
        logger.info({metadata: {updateIds}}, 'No updates were found');
        return [];
    }

    return result.rows;
}

async function markUpdatesAsRead(updateIds, userId, patientId) {
    let batches = [updateIds];

    if (updateIds.length > PG_INSERT_BATCH_SIZE) {
        logger.debug({metadata: {updateIds}}, 'Creating update read receipt chunk...');
        batches = chunk(updateIds, PG_INSERT_BATCH_SIZE);
    }

    const readReceiptsPromises = batches.map(async (batch) => {
        const params = new Array(batch.length * 4);
        const queryValues = new Array(batch.length);

        batch.forEach((updateId, index) => {
            const baseIndex = index * 4;
            queryValues[index] = `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${
                baseIndex + 4
            })`;
            params[baseIndex] = updateId;
            params[baseIndex + 1] = userId;
            params[baseIndex + 2] = patientId;
            params[baseIndex + 3] = new Date();
        });

        const query = `
            INSERT INTO updates_read_receipts(update_id, user_id, patient_id, read_at) 
            VALUES
                ${queryValues.join(',')}
            ON CONFLICT DO NOTHING
            RETURNING update_id;
        `;

        return await runWithTransaction(async (dbClient) => {
            return await dbClient.query(query, params);
        });
    });

    const updatesQuery = `
        UPDATE updates
        SET read = $1
        WHERE id = ANY($2)
            AND read != $1;
    `;

    await runWithTransaction((dbClient) => {
        return dbClient.query(updatesQuery, [true, updateIds]);
    });

    const results = await Promise.all(readReceiptsPromises);

    const readUpdateIds = results.flatMap((result) =>
        result.rows.map((row) => ({
            id: row.update_id
        }))
    );

    if (!readUpdateIds.length) {
        logger.info(
            {metadata: {updateIds}},
            'No updates were found or user has already read the update'
        );
        return [];
    }
    return readUpdateIds;
}

async function removeUpdateByIds(updateIds, dbClient) {
    logger.debug('Removing update by update id...');
    const deleteUpdatesQueryText = `
          DELETE FROM updates
            WHERE updates.id = ANY($1);
    `;

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await pool.query(deleteUpdatesQueryText, [updateIds]);

    return result.rowCount;
}

async function getReadReceiptsByUpdateId(updateId) {
    logger.debug('Getting read receipts by update id...');
    const selectQueryText = `
        SELECT 
            r.read_at read_receipts_read_at,
            r.user_id as read_receipts_user_id,
            u.first_name as read_receipts_first_name,
            u.last_name as read_receipts_last_name,
            u.assigned_roles as read_receipts_roles,
            fi.patient_relationship as read_receipts_patient_relationship
        FROM updates_read_receipts r
        LEFT JOIN users u on r.user_id = u.user_id
        LEFT JOIN family_identities fi on u.user_id = fi.user_id
        WHERE r.update_id = $1;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(selectQueryText, [updateId]);

    if (!results.rowCount) {
        logger.info({metadata: {updateId}}, 'No read receipts were found');
        return [];
    }

    return results.rows.map((element) => {
        return createReadReceiptTemplate({
            timestamp: element.read_receipts_read_at?.toISOString(),
            user: createUserTemplate({
                id: element.read_receipts_user_id,
                firstName: element.read_receipts_first_name,
                lastName: element.read_receipts_last_name,
                role: element.read_receipts_roles.includes(FAMILY_MEMBER)
                    ? FAMILY_MEMBER
                    : CAREGIVER,
                patientRelationship: element.read_receipts_patient_relationship
            })
        });
    });
}

/**
 * Async function to get the count of unread updates for a specific patient by patientId and userId.
 * Unread counts for updates, unreadUpdateCount, will be calculated on the Ohana server side through a function added in the UpdatesDao file.
 * This function will perform an PGSQL query on the database to obtain the number of unread updates for a certain user per patient.
 * @async
 * @function getUnreadUpdatesByPatientId
 * @param {string} patientId - The id of the patient.
 * @param {string} userId - The id of the user.
 * @throws {Error} If the query executes with an error or no result found.
 * @returns {Promise<number>} A promise that resolves to the count of unread updates.
 */
async function getUnreadUpdatesByPatientId(patientId, userId) {
    logger.debug('Getting Unread updates by patient and user id...');
    const query = `
        SELECT 
            COUNT(*)
        FROM updates
                 LEFT JOIN encounters e ON e."id" = updates.encounter_id
        WHERE updates."id" NOT IN ( (SELECT update_id
                                     FROM updates_read_receipts urr
                                     WHERE urr.user_id = $2))
          AND updates.patient_id = $1
          AND updates.user_id != $2
          AND e.ended_at IS NULL
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [patientId, userId]);

    if (!result.rowCount) {
        logger.warn({metadata: {patientId}}, 'No information found on read updates.');
        return 0;
    }

    return parseInt(result.rows[0].count);
}

module.exports = {
    createUpdate,
    markUpdatesAsRead,
    removeUpdateByIds,
    getUpdateByUpdateIds,
    getUpdatesByPatientId,
    getReadReceiptsByUpdateId,
    getUnreadUpdatesByPatientId
};
