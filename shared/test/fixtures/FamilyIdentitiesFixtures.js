const {
    OHANA_ROLES: {CAREGIVER}
} = require('../../constants');

/**
 *
 * @param database - A database client instance
 * @param id - family identity id
 * @returns {*}
 */
function selectTestFamilyIdentityById(database, id) {
    const parameters = [id];
    return database.query(
        `SELECT user_id, patient_id, public_key, phone_number 
         FROM family_identities where user_id = $1;`,
        parameters
    );
}

/**
 *
 * @param database - A database client instance
 * @param familyIdentity FamilyIdentity
 * @returns {*}
 */
function createTestFamilyIdentity(database, familyIdentity) {
    const {
        userId,
        patientId,
        phoneNumber,
        publicKey,
        preferredLocale,
        patientRelationship,
        role = '',
        invitedBy
    } = familyIdentity;
    const parameters = [
        userId,
        patientId,
        invitedBy,
        phoneNumber,
        publicKey,
        preferredLocale,
        patientRelationship,
        role === CAREGIVER,
        new Date()
    ];
    return database.query(
        `INSERT INTO family_identities 
                   (user_id,patient_id,invited_by,phone_number,public_key, preferred_locale, patient_relationship, is_primary, created_at) 
                   VALUES($1,$2,$3,$4, $5, $6, $7, $8, $9) RETURNING user_id;`,
        parameters
    );
}

function selectTestFamilyIdentityByUserId(database, userId) {
    const parameters = [userId];
    return database.query(
        `SELECT patient_id, public_key, phone_number, patient_relationship, preferred_locale, is_patient
         FROM family_identities where user_id = $1;`,
        parameters
    );
}

module.exports = {
    selectTestFamilyIdentityById,
    createTestFamilyIdentity,
    selectTestFamilyIdentityByUserId
};
