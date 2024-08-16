const {
    CONSTANTS: {
        AUDIT_EVENTS: {PATIENT_DISASSOCIATED},
        DISABLE_CSA_INTEGRATION
    },
    UnauthorizedError,
    ForbiddenError,
    getLogger,
    isUserMappedToPatient,
    updateUserPatientMappingDeletedStatus,
    createAuditEvent,
    removeSessionMappedPatientById,
    getPatientActiveEncountersById,
    removeChatMembers
} = require('ohana-shared');

async function DisassociatePatientResolver(_parent, args, context) {
    const logger = getLogger('DisassociatePatientResolver', context);
    const {
        tenantId,
        userId,
        mappedPatients,
        version,
        buildNumber,
        role,
        email,
        firstName,
        lastName,
        title,
        deviceId,
        deviceModel,
        osVersion,
        tenantShortCode
    } = context;
    const {patientId} = args;

    const metadata = {...logger.bindings()?.metadata, patientId};

    const patient = await getPatientActiveEncountersById(patientId);
    if (!patient) {
        logger.error({metadata}, 'No active encounter found!');
        throw new UnauthorizedError({description: 'No active encounter found!'});
    }
    if (!(await isUserMappedToPatient(userId, patientId, mappedPatients))) {
        logger.error({metadata}, 'Cannot disassociate a patient you are not mapped to');
        throw new ForbiddenError({
            message: 'Cannot disassociate a patient you are not mapped to'
        });
    }

    const response = await updateUserPatientMappingDeletedStatus(
        {
            patientId,
            userId,
            encounterIds: patient.encounterIds,
            deleted: true
        },
        null
    );

    if (!response) {
        logger.debug(
            {metadata: {patientId, userId, encounterIds: patient.encounterIds}},
            'No user patient mapping exists'
        );
        return false;
    }

    await removeSessionMappedPatientById(patientId, userId);

    if (!DISABLE_CSA_INTEGRATION && patient.patientUlid) {
        await removeChatMembers(patient.patientUlid, tenantShortCode, userId, [{id: userId, role}]);
    }

    await createAuditEvent({
        eventId: PATIENT_DISASSOCIATED,
        patientId,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${lastName}, ${firstName}`,
        deviceId,
        deviceModel,
        osVersion,
        version,
        buildNumber,
        tenantId,
        locationId: patient.locationId,
        performingUserTitle: title
    });

    return true;
}

module.exports = DisassociatePatientResolver;
