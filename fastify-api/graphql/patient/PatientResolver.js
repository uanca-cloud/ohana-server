const {
    getPatientById,
    createPatientTemplate,
    getLocationSetting,
    getFamilyMembersByPatientId,
    getTenantSetting,
    getUpdates,
    CONSTANTS: {
        AUDIT_EVENTS: {PATIENT_PROFILE_VIEW},
        LOCATION_SETTINGS_KEYS: {ALLOW_SECONDARY_FAMILY_MEMBERS},
        TENANT_SETTINGS_KEYS: {FREE_TEXT_TRANSLATION_FLAG}
    },
    createAuditEvent,
    formatDeviceId,
    hasOpenEncounter,
    NotFoundError,
    getLogger,
    getCaregiversByPatientId,
    isUserMappedToPatient,
    ForbiddenError
} = require('ohana-shared');

async function PatientResolver(_parent, args, context) {
    const logger = getLogger('PatientResolver', context);
    const {
        userId,
        tenantId,
        deviceId,
        deviceName,
        role,
        firstName: performingUserFirstName,
        lastName: performingUserLastName,
        deviceModel,
        version,
        buildNumber,
        osVersion,
        email,
        title,
        mappedPatients
    } = context;
    const {patientId, externalId} = args;
    const metadata = {...logger.bindings()?.metadata, patientId};

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error({metadata}, 'Patient does not have any ongoing encounter');
        throw new NotFoundError({description: 'Patient does not have any ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patientId, mappedPatients))) {
        logger.error({metadata}, 'Cannot look up a patient you are not mapped to');
        throw new ForbiddenError({message: 'Cannot look up a patient you are not mapped to'});
    }

    const patient = await getPatientById({id: patientId, tenantId, externalId});

    let allowSecondaryFamilyMembers = null;
    const allowSecondaryFamilyMemberFromAdmin = await getLocationSetting({
        locationId: patient.location.id,
        tenantId,
        key: ALLOW_SECONDARY_FAMILY_MEMBERS
    });
    if (
        allowSecondaryFamilyMemberFromAdmin &&
        allowSecondaryFamilyMemberFromAdmin.value === 'true'
    ) {
        allowSecondaryFamilyMembers = patient.allowSecondaryFamilyMembers;
    }

    let familyMembers = await getFamilyMembersByPatientId(patient.id);

    familyMembers = familyMembers.map((familyMember) => {
        familyMember.createdAt = familyMember.createdAt
            ? familyMember.createdAt.toISOString()
            : null;
        return familyMember;
    });

    const allowFreeTextTranslationSetting = await getTenantSetting({
        key: FREE_TEXT_TRANSLATION_FLAG,
        tenantId
    });
    const updates = await getUpdates(patient.id, allowFreeTextTranslationSetting);

    const caregivers = await getCaregiversByPatientId(patient.id);

    await createAuditEvent({
        eventId: PATIENT_PROFILE_VIEW,
        patientId: patient.id,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${performingUserLastName}, ${performingUserFirstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        tenantId,
        locationId: patient?.location?.id,
        performingUserTitle: title,
        externalId: externalId ?? patient?.externalId
    });

    return createPatientTemplate({
        id: patient.encounterId,
        ...patient,
        familyMembers,
        updates,
        allowSecondaryFamilyMembers,
        caregivers
    });
}

module.exports = PatientResolver;
