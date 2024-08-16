/**
 *
 * @type {Object.<string, UserPatientMapping>}
 */

/**
 *
 * @param database - A database client instance
 * @param userPatientMapping UserPatientMapping
 * @returns {*}
 */
function insertTestUserPatientsMapping(database, userPatientMapping) {
    userPatientMapping.deleted =
        userPatientMapping.deleted === undefined ? false : userPatientMapping.deleted;
    const parameters = [
        userPatientMapping.patientId,
        userPatientMapping.userId,
        userPatientMapping.encounterId,
        userPatientMapping.deleted
    ];

    return database.query(
        `INSERT INTO users_patients_mapping (
            patient_id, user_id, encounter_id, deleted
        ) VALUES ($1, $2, $3, $4);`,
        parameters
    );
}

/**
 *
 * @param database - A database client instance
 * @param userPatientMapping UserPatient
 * @returns {*}
 */
function selectTestUserPatientMapping(database, userPatientMapping) {
    const parameters = [userPatientMapping.patientId, userPatientMapping.userId];
    try {
        return database.query(
            `SELECT * FROM users_patients_mapping WHERE patient_id = $1 AND user_id = $2 AND deleted = false;`,
            parameters
        );
    } catch (error) {
        console.log('Here is the error', error);
    }
}

/**
 *
 * @param database - A database client instance
 * @param patientId String
 * @param getDeleted Boolean
 * @returns {*}
 */
function selectTestUserPatientMappingByPatientId(database, patientId, getDeleted = false) {
    try {
        return database.query(
            `SELECT * FROM users_patients_mapping WHERE patient_id = $1 AND deleted = $2;`,
            [patientId, getDeleted]
        );
    } catch (error) {
        console.log('Here is the error', error);
    }
}

module.exports = {
    insertTestUserPatientsMapping,
    selectTestUserPatientMapping,
    selectTestUserPatientMappingByPatientId
};
