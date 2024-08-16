const {
    CONSTANTS: {
        AUDIT_EVENTS: {PATIENT_DETAILS_EDITED}
    },
    createAuditEvent,
    getLogger,
    formatDeviceId,
    updatePatientData
} = require('ohana-shared');

async function UpdatePatientResolver(_parent, args, context) {
    const logger = getLogger('UpdatePatientResolver', context);
    logger.debug('Updating patient...');

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
            eventId: PATIENT_DETAILS_EDITED,
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
            externalId: updatedPatient?.externalId
        });
    }

    return updatedPatient;
}

module.exports = UpdatePatientResolver;
