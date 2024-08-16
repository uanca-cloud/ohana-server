/**
 *
 * @type {Object.<string, Patient>}
 */
const patientFixtureData = {
    testPatient1: {
        firstName: 'vlad',
        lastName: 'doe',
        externalId: '12345',
        externalIdType: 'mrn',
        tenantId: 1,
        dateOfBirth: '1991-03-15',
        allowSecondary: true,
        patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
    },
    testPatient2: {
        firstName: 'john',
        lastName: 'doe',
        externalId: '1234',
        externalIdType: 'mrn',
        tenantId: 1,
        dateOfBirth: '1991-03-15',
        allowSecondary: true,
        patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
    },
    testPatient3: {
        firstName: 'john',
        lastName: 'john',
        externalId: '1234555',
        externalIdType: 'mrn',
        tenantId: 1,
        dateOfBirth: '1991-03-15',
        allowSecondary: true,
        patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
    },
    testPatient4: {
        firstName: 'john',
        lastName: 'john',
        externalId: '123456',
        externalIdType: 'vn',
        tenantId: 1,
        dateOfBirth: '1991-03-15',
        allowSecondary: true,
        patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
    }
};

/**
 * Inserts a test patient into the database
 * @param database - A database client instance
 * @param {Patient} patient
 * @returns Promise<{*}>
 */
function createTestPatient(database, patient) {
    const parameters = [
        patient.externalId,
        patient.externalIdType,
        patient.tenantId,
        patient.firstName,
        patient.lastName,
        patient.dateOfBirth,
        patient.location,
        patient.allowSecondary,
        patient.patientUlid,
        patient.chatEnabled || true
    ];

    return database.query(
        `   INSERT INTO patients (
            external_id,
            external_id_type,
            tenant_id,
            first_name,
            last_name,
            date_of_birth,
            location_id,
            allow_secondary,
            patient_ulid,
            enable_chat
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;`,
        parameters
    );
}

function selectTestPatientByField(database, field, fieldValue) {
    const parameters = [fieldValue];
    try {
        return database.query(`SELECT * FROM patients where ${field} = $1;`, parameters);
    } catch (error) {
        console.log('Here is the error', error);
    }
}

module.exports = {
    patientFixtureData,
    createTestPatient,
    selectTestPatientByField
};
