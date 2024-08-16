const {FAMILY_RELATION_WITH_PATIENT} = require('./constants');
const {hasPatientUserRegistered} = require('./family/FamilyIdentityDao');

const isPatient = (patientRelationship) => patientRelationship === FAMILY_RELATION_WITH_PATIENT;
const isPatientAndNotPrimary = (patientRelationship, primary) =>
    isPatient(patientRelationship) && !primary;
const isDuplicatePatient = async (patientRelationship, patientId, userId) =>
    isPatient(patientRelationship) && (await hasPatientUserRegistered(patientId, userId));

module.exports = {isPatient, isPatientAndNotPrimary, isDuplicatePatient};
