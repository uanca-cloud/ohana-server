const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        LOCATION_SETTINGS_KEYS: {PATIENT_AUTO_UNENROLLMENT_IN_HOURS}
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    {runBatchQuery} = require('../DaoHelper');

const logger = getLogger('EncounterDao');

/**
 * @typedef {Object} Encounter
 * @property {string} patientId
 * @property {string} tenantId
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {Date|null} endedAt
 */

/**
 *
 * @param dbClient - A database client instance
 * @param encounter Encounter
 * @returns {Promise<*|null>}
 */
async function createEncounter(encounter, dbClient) {
    logger.debug('Creating an encounter...');
    const {patientId, tenantId, externalId} = encounter;
    //creates a new encounter row only if we don't have an ongoing encounter for a certain patient
    //a patient should have only one active encounter
    const insertEncounterQuery = `
            INSERT INTO encounters (
                patient_id,
                tenant_id,
                created_at,
                updated_at,
                external_id
            )
            SELECT $1, $2, $3, $4, $5
            WHERE NOT EXISTS (SELECT patient_id FROM encounters WHERE patient_id = $1 and ended_at is null) RETURNING id;
        `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(insertEncounterQuery, [
        patientId,
        tenantId,
        new Date(),
        new Date(),
        externalId
    ]);
}

async function addEncounter(encounter, dbClient) {
    logger.debug('Adding an encounter...');
    const {patientId, tenantId, externalId} = encounter;
    const insertEncounterQuery = `
            INSERT INTO encounters (
                patient_id,
                tenant_id,
                created_at,
                updated_at,
                external_id
            ) VALUES ($1, $2, $3, $4, $5)
             RETURNING id;
        `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(insertEncounterQuery, [
        patientId,
        tenantId,
        new Date(),
        new Date(),
        externalId
    ]);
}

/**
 * Sets `ended_at` for a batch of encounter ids, effectively marking them as ended
 * @param dbClient
 * @param encounterIds
 * @returns {Promise<void>}
 */
async function endEncounters(encounterIds, dbClient) {
    logger.debug('Ending encounters...');
    const query = `
        UPDATE encounters 
        SET ended_at = $2 
        WHERE id = ANY ($1);
    `;
    await runBatchQuery(dbClient, encounterIds, query, [new Date()]);
}

async function isClosedEncounter(encounterId, dbClient) {
    logger.debug('Checking if encounter exists...');
    const selectEncounterQuery = `
        SELECT ended_at FROM encounters WHERE id = $1;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(selectEncounterQuery, [encounterId]);

    if (!result.rowCount) {
        logger.info({metadata: {encounterId}}, 'No encounter exists');
        return true;
    }

    return Boolean(result.rows[0].ended_at);
}

async function updateEncounters(patient, dbClient) {
    logger.info('Updating all encounters...');
    const {patientId} = patient;
    const updateEncounterQuery = `
       UPDATE encounters 
       SET updated_at = $1 
       WHERE patient_id = $2 
        AND ended_at IS NULL;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(updateEncounterQuery, [new Date(), patientId]);
}

async function updateEncounter(encounter, dbClient) {
    logger.info('Updating encounter...');
    const {encounterId} = encounter;
    const updateEncounterQuery = `
       UPDATE encounters 
       SET updated_at = $1 
       WHERE id = $2 
       AND ended_at IS NULL 
       returning external_id;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await client.query(updateEncounterQuery, [new Date(), encounterId]);

    if (!result.rowCount) {
        logger.info({metadata: {encounterId}}, 'No encounter exists');
        return null;
    } else {
        return result.rows[0].external_id;
    }
}

/**
 * Returns encounters that are inactive for a period of time > the limit defined in settings
 * @param dbClient
 * @returns {Promise<null|{id: String}>}
 */
async function getInactiveEncounters(dbClient) {
    logger.debug('Getting inactive encounters...');
    const query = ` 
        SELECT
            e.id
        FROM patients p
        LEFT JOIN encounters e ON p.id = e.patient_id
        LEFT JOIN location_settings ls ON ls.location_id = p.location_id
        WHERE e.ended_at IS NULL 
            AND p.location_id IS NOT NULL
            AND ls.key = $1
        GROUP BY p.id, e.id, ls.value
        HAVING EXTRACT(EPOCH FROM current_timestamp - e.updated_at)/3600 >= ls.value::int;
    `;

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(query, [PATIENT_AUTO_UNENROLLMENT_IN_HOURS]);

    if (!results.rowCount) {
        logger.info('No inactive encounters found');
        return null;
    }

    return results.rows;
}

async function hasOpenEncounter(patientId, tenantId, dbClient) {
    logger.debug('Checking if active encounter exists for patientId...');
    const selectEncounterQuery = `
        SELECT ended_at FROM encounters WHERE patient_id = $1 AND ended_at IS NULL AND tenant_id = $2;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(selectEncounterQuery, [patientId, tenantId]);

    return result.rowCount > 0;
}

module.exports = {
    createEncounter,
    endEncounters,
    updateEncounters,
    updateEncounter,
    isClosedEncounter,
    getInactiveEncounters,
    addEncounter,
    hasOpenEncounter
};
