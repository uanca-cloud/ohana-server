const {
    CONSTANTS: {
        AUDIT_EVENTS: {PATIENT_SCANNED},
        SCAN_STATUS: {EXISTING}
    },
    createAuditEvent,
    getLogger,
    formatDeviceId,
    updatePatientData,
    updateEncounters
} = require('ohana-shared');

async function RescanPatientResolver(_parent, args, context) {
    const logger = getLogger('RescanPatientResolver', context);
    logger.debug('Rescanning patient...');

    const {
        deviceId,
        deviceName,
        tenantId,
        role,
        firstName: performingUserFirstName,
        lastName: performingUserLastName,
        version,
        buildNumber,
        deviceModel,
        osVersion,
        title,
        email
    } = context;
    const {id} = args.patient;

    const updatedPatient = await updatePatientData(args.patient, context);

    if (updatedPatient) {
        await createAuditEvent({
            eventId: PATIENT_SCANNED,
            patientId: id,
            performingUserEmail: email,
            userType: role,
            userDisplayName: `${performingUserLastName}, ${performingUserFirstName}`,
            deviceId: formatDeviceId(deviceName, deviceId),
            deviceModel,
            osVersion,
            version,
            buildNumber,
            tenantId,
            locationId: updatedPatient?.location.id,
            performingUserTitle: title,
            scanStatus: EXISTING,
            externalId: updatedPatient?.externalId
        });
        await updateEncounters({patientId: id});
    }

    return updatedPatient;
}

module.exports = RescanPatientResolver;
