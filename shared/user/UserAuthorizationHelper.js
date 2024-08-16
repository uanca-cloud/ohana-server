const {getLogger} = require('../logs/LoggingService'),
    {getAllPatientsIdsByUser} = require('../patient/PatientDao'),
    {insertSessionMappedPatientByIds} = require('../SessionService');

async function isUserMappedToPatient(user, patientId, mappedPatients) {
    const {userId} = user;
    const logger = getLogger('UserAuthorizationHelper::isUserMappedToPatient', {userId});

    logger.debug({metadata: {userId, patientId}}, 'Checking if mapped patient list is empty...');
    if (!mappedPatients || mappedPatients.length === 0) {
        mappedPatients = await rehydrateUserMappedPatients(user);
    }

    logger.debug({metadata: {userId, patientId}}, 'Checking if user is mapped to patient...');
    if (mappedPatients.some((mappedPatientId) => mappedPatientId === parseInt(patientId))) {
        logger.debug({metadata: {userId, patientId}}, 'User is mapped to patient...');
        return true;
    } else {
        logger.debug({metadata: {userId, patientId}}, 'User is not mapped to patient');
        return false;
    }
}

async function rehydrateUserMappedPatients(user) {
    const {userId} = user;
    const logger = getLogger('UserAuthorizationHelper::rehydrateUserMappedPatients', {userId});
    const mappedPatients = await getAllPatientsIdsByUser(user);

    if (mappedPatients.length > 0) {
        logger.debug(
            {metadata: {userId}},
            'update session mappedPatients for found patient id(s)...'
        );
        await insertSessionMappedPatientByIds(mappedPatients, userId);
    }

    logger.debug({metadata: {userId}}, 'return the updated mappedPatients list');
    return mappedPatients;
}

module.exports = {
    isUserMappedToPatient,
    rehydrateUserMappedPatients
};
