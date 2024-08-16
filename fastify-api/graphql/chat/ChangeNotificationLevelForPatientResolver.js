const {
    getLogger,
    hasOpenEncounter,
    NotFoundError,
    isUserMappedToPatient,
    ForbiddenError,
    updateChatNotificationLevel,
    getPatientById,
    publishMuteChatNotifications
} = require('ohana-shared');

async function ChangeNotificationLevelForPatientResolver(
    _parent,
    {input},
    {tenantId, userId, mappedPatients, tenantShortCode, deviceId}
) {
    const {patientId, notificationLevel} = input;

    const logger = getLogger('ChangeNotificationLevelForPatientResolver', {
        tenantId,
        userId,
        patientId
    });

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error('Patient does not have an ongoing encounter');
        throw new NotFoundError({description: 'Patient does not have an ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patientId, mappedPatients))) {
        logger.error('Cannot look up a patient you are not mapped to');
        throw new ForbiddenError({message: 'Cannot look up a patient you are not mapped to'});
    }

    const patient = await getPatientById({id: patientId, tenantId});

    if (!patient?.patientUlid) {
        logger.error('Patient does not have an open chat channel');
        throw new NotFoundError({description: 'Patient does not have an open chat channel'});
    }

    await updateChatNotificationLevel({
        patientId,
        patientUlid: patient.patientUlid,
        userId,
        tenantShortCode,
        notificationLevel
    });

    publishMuteChatNotifications(patientId, notificationLevel, userId, deviceId);

    return notificationLevel;
}

module.exports = ChangeNotificationLevelForPatientResolver;
