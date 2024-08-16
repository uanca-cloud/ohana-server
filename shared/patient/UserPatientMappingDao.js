const {getDatabasePool} = require('../DatabasePoolFactory'),
    {DB_CONNECTION_POOLS} = require('../constants'),
    {getLogger} = require('../logs/LoggingService');
const {runBatchQuery} = require('../DaoHelper');

const logger = getLogger('UserPatientMappingDao');

/**
 * @typedef {Object} UserPatientMapping
 * @property {string} patient
 * @property {string} userId
 * @property {string} encounterId
 */

/**
 *
 * @param dbClient - A database client instance
 * @param userPatientMapping UserPatientMapping
 * @returns {Promise<*|null>}
 */
async function createUserPatientMapping(userPatientMapping, dbClient) {
    logger.debug('Creating user patient mapping...');

    const {patientId, userId, encounterId} = userPatientMapping;
    const insertUserPatientMapping = `
            INSERT INTO users_patients_mapping (
                patient_id,
                user_id,
                encounter_id
               )
            SELECT $1, $2, $3
            WHERE NOT EXISTS (
                SELECT id 
                  FROM users_patients_mapping 
                WHERE patient_id = $1 
                  AND user_id = $2 
                  AND encounter_id = $3
            );
        `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return client.query(insertUserPatientMapping, [patientId, userId, encounterId]);
}

/**
 *
 * @param dbClient - A database client instance
 * @param userId String
 * @returns {Promise<*|null>}
 */
async function removeUserPatientMapping(userId, dbClient = null) {
    logger.debug('Removing user patient mappings by user id...');
    const deleteUserPatientMapping = `
        DELETE FROM users_patients_mapping 
        WHERE user_id = $1;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await client.query(deleteUserPatientMapping, [userId]);

    return true;
}

/**
 * Permanently delete link between patient and user ids
 * @param dbClient
 * @param userIds
 * @returns {Promise<void>}
 */
async function removeUserPatientMappingsByUserIds(userIds, dbClient) {
    logger.debug('Removing user patient mapping by patient id...');
    const query = `
        DELETE FROM users_patients_mapping 
        WHERE user_id = ANY($1);
    `;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await client.query(query, [userIds]);
}

/**
 *
 * @param dbClient - A database client instance
 * @param userPatientMapping UserPatientMapping
 * @returns {Promise<*|null>}
 */
async function getUserPatientMapping(userPatientMapping, dbClient) {
    const {patientId, userId, encounterId} = userPatientMapping;
    const userPatientMappings = `
           SELECT id, user_id, patient_id, encounter_id 
             FROM users_patients_mapping upm
           WHERE patient_id = $1 
             AND user_id = $2 
             AND encounter_id = $3;
        `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(userPatientMappings, [patientId, userId, encounterId]);

    if (!results.rowCount) {
        logger.info({metadata: {patientId, userId, encounterId}}, 'No user patient mapping exists');
        return null;
    }

    return results.rows.map((result) => {
        return {
            id: result.id,
            userId: result.user_id,
            encounterId: result.encounter_id,
            patientId: result.patient_id
        };
    });
}

/**
 *
 * @param dbClient - A database client instance
 * @param userPatientMapping UserPatientMapping
 * @returns {Promise<*|null>}
 */
async function updateUserPatientMappingDeletedStatus(userPatientMapping, dbClient) {
    const {patientId, userId, encounterIds, deleted = false} = userPatientMapping;
    const query = `
            UPDATE users_patients_mapping
            SET deleted = $4
            WHERE patient_id = $2
              AND user_id = $3
              AND encounter_id = ANY ($1)
        `;
    const results = await runBatchQuery(dbClient, encounterIds, query, [
        patientId,
        userId,
        deleted
    ]);

    if (results[0].rowCount <= 0) {
        logger.info(
            {metadata: {patientId, userId, encounterIds}},
            'No user patient mapping exists'
        );
        return false;
    }

    return true;
}

module.exports = {
    createUserPatientMapping,
    removeUserPatientMapping,
    getUserPatientMapping,
    updateUserPatientMappingDeletedStatus,
    removeUserPatientMappingsByUserIds
};
