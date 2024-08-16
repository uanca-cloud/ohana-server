const {
    assignUserToPatient,
    hasOpenEncounter,
    createAuditEvent,
    CONSTANTS: {
        AUDIT_EVENTS: {PATIENT_SCANNED},
        SCAN_STATUS: {EXISTING},
        DISABLE_CSA_INTEGRATION
    },
    formatDeviceId,
    getLogger,
    UnauthorizedError,
    insertSessionMappedPatientByIds,
    isUserMappedToPatient,
    addChatMembers
} = require('ohana-shared');

async function AssignCaregiverToPatientResolver(_parent, args, context) {
    const logger = getLogger('AssignCaregiverToPatientResolver', context);
    const {
        userId,
        role,
        firstName,
        lastName,
        version,
        buildNumber,
        deviceModel,
        osVersion,
        deviceId,
        tenantId,
        deviceName,
        email,
        title,
        mappedPatients,
        tenantShortCode
    } = context;
    const {patientId, encounterId} = args;
    const metadata = {...logger.bindings()?.metadata, patientId, encounterId};

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error({metadata}, 'Patient does not have an ongoing encounter!');
        throw new UnauthorizedError({description: 'Patient does not have an ongoing encounter!'});
    }

    const result = await assignUserToPatient({patientId, encounterId, userId, tenantId});
    if (!result) {
        logger.error({metadata}, 'Unable to assign caregiver to patient');
        throw new Error('Unable to assign caregiver to patient');
    }

    if (!(await isUserMappedToPatient(userId, patientId, mappedPatients))) {
        // If patient is not included in mapped patients add them
        await insertSessionMappedPatientByIds([patientId], userId);
    }

    if (result.patientUlid && !DISABLE_CSA_INTEGRATION) {
        await addChatMembers(result.patientUlid, tenantShortCode, [{id: userId, role}]);
    }

    await createAuditEvent({
        eventId: PATIENT_SCANNED,
        patientId,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${lastName}, ${firstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        scanStatus: EXISTING,
        tenantId,
        locationId: result.location.id,
        performingUserTitle: title,
        externalId: result.externalId
    });

    return result;
}

module.exports = AssignCaregiverToPatientResolver;
