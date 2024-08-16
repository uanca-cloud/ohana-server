/**
 *
 * @type {Object.<string, Encounter>}
 */

const fixtureData = {
    encounter1: {
        tenantId: 1
    },
    encounter2: {
        tenantId: 1,
        externalId: 'VN1'
    }
};

/**
 * Inserts a test patient into the database
 * @param database - A database client instance
 * @param {{tenantId: number, patientId: number}} encounter
 * @returns Promise<{*}>
 */
function createTestEncounter(database, encounter) {
    const {patientId, tenantId, updatedAt = new Date()} = encounter;

    return database.query(
        `INSERT INTO encounters (
                patient_id,
                tenant_id,
                created_at,
                updated_at
            )
            SELECT $1, $2, $3, $4
            WHERE NOT EXISTS (SELECT patient_id FROM encounters WHERE patient_id = $1 and ended_at is null) RETURNING id;`,
        [patientId, tenantId, new Date(), updatedAt]
    );
}

/**
 * Inserts a test patient into the database
 * @param database - A database client instance
 * @param {{tenantId: number, patientId: number}} encounter
 * @returns Promise<{*}>
 */
function addTestEncounterToPatient(database, encounter) {
    const {patientId, tenantId, externalId} = encounter;

    return database.query(
        `INSERT INTO encounters (
                patient_id,
                tenant_id,
                created_at,
                updated_at,
                external_id
            ) VALUES ($1, $2, $3, $4, $5)
             RETURNING id;`,
        [patientId, tenantId, new Date(), new Date(), externalId]
    );
}

/**
 *
 * @param database - A database client instance
 * @param patientId String
 * @returns {*}
 */
function selectTestEncounterByPatientId(database, patientId) {
    return database.query(
        `SELECT id, patient_id, tenant_id, created_at, ended_at, updated_at, external_id FROM encounters WHERE patient_id = $1;`,
        [patientId]
    );
}

/**
 *
 * @param database - A database client instance
 * @param patientId String
 * @returns {*}
 */
function endTestEncounter(database, patientId) {
    return database.query(`UPDATE encounters SET ended_at = $1 WHERE patient_id = $2;`, [
        new Date(),
        patientId
    ]);
}

module.exports = {
    fixtureData,
    createTestEncounter,
    selectTestEncounterByPatientId,
    endTestEncounter,
    addTestEncounterToPatient
};
