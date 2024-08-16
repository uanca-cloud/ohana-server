const {
    enrollPatient,
    createAuditEvent,
    getTenantSetting,
    CONSTANTS: {
        TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE},
        AUDIT_EVENTS: {PATIENT_SCANNED},
        SCAN_STATUS: {NEW},
        PATIENT_CDR_ID_HASH,
        EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE,
        ALLOW_SECONDARY_FAMILY_MEMBERS
    },
    formatDeviceId,
    getLogger,
    getPatientByCdrId,
    addEncounterToPatient,
    getRedisCollectionData,
    delRedisCollectionData,
    formatCDRHashId,
    getLocationSetting,
    updatePatientAllowSecondary,
    insertSessionMappedPatientByIds,
    isUserMappedToPatient,
    getCaregiversByPatientId,
    NotFoundError,
    ForbiddenError
} = require('ohana-shared');

async function EnrollPatientResolver(_parent, args, context) {
    const logger = getLogger('EnrollPatientResolver', context);
    const {
        tenantId,
        userId,
        role,
        deviceId,
        firstName: performingUserFirstName,
        lastName: performingUserLastName,
        deviceModel,
        osVersion,
        deviceName,
        email,
        title,
        version,
        buildNumber,
        mappedPatients,
        assignedRoles
    } = context;
    const {externalId, firstName, lastName, dateOfBirth, location, allowSecondaryFamilyMembers} =
        args.patient;

    const setting = await getTenantSetting({tenantId, key: EXTERNAL_ID_TYPE});
    const externalIdType = setting ? setting.value : null;
    const dateOfBirthUTC = new Date(`${dateOfBirth}T00:00:00Z`);
    const redisPatientData = await getRedisCollectionData(
        PATIENT_CDR_ID_HASH,
        formatCDRHashId(tenantId, externalId, externalIdType)
    );
    const cdrId = redisPatientData ? redisPatientData.cdrId : null;
    const patientByCdr = cdrId ? await getPatientByCdrId(cdrId, tenantId) : null;
    let patientResponse;

    if (!patientByCdr || externalIdType !== EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE) {
        patientResponse = await enrollPatient({
            externalId,
            firstName,
            lastName,
            dateOfBirth: dateOfBirthUTC,
            location,
            externalIdType,
            userId,
            tenantId,
            allowSecondaryFamilyMembers: !!allowSecondaryFamilyMembers,
            cdrId,
            assignedRoles
        });
    } else {
        patientResponse = await addEncounterToPatient({
            allowSecondaryFamilyMembers: !!allowSecondaryFamilyMembers,
            userId,
            firstName,
            lastName,
            dateOfBirth,
            location,
            tenantId,
            id: patientByCdr.id,
            externalId,
            externalIdType,
            assignedRoles
        });

        if (patientResponse) {
            const allowSecondaryFamilyMemberFromAdmin = await getLocationSetting({
                locationId: location,
                tenantId,
                key: ALLOW_SECONDARY_FAMILY_MEMBERS
            });
            if (
                allowSecondaryFamilyMemberFromAdmin &&
                allowSecondaryFamilyMemberFromAdmin.value === 'true'
            ) {
                await updatePatientAllowSecondary(
                    {
                        patientId: patientResponse.id,
                        allowSecondary: !!allowSecondaryFamilyMembers
                    },
                    null
                );
            }
        }
    }

    if (!patientResponse) {
        logger.error('Not allowed to enroll patients');
        throw new ForbiddenError({message: 'Not allowed to enroll patients'});
    }

    await delRedisCollectionData(
        PATIENT_CDR_ID_HASH,
        formatCDRHashId(tenantId, externalId, externalIdType)
    );

    if (!(await isUserMappedToPatient({userId, tenantId}, patientResponse.id, mappedPatients))) {
        await insertSessionMappedPatientByIds([patientResponse.id], userId);
    }

    const caregivers = await getCaregiversByPatientId(patientResponse.id);
    if (!caregivers.length) {
        logger.error(
            'No caregiver(s) tied to the patient and patient can not exist without a caregiver'
        );
        throw new NotFoundError(
            'No caregiver(s) tied to the patient and patient can not exist without a caregiver'
        );
    }
    Object.assign(patientResponse, {caregivers});

    await createAuditEvent({
        eventId: PATIENT_SCANNED,
        patientId: patientResponse.id,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${performingUserLastName}, ${performingUserFirstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        scanStatus: NEW,
        tenantId,
        locationId: patientResponse?.location.id,
        performingUserTitle: title,
        externalId: externalId ?? patientResponse?.externalId
    });

    return patientResponse;
}

module.exports = EnrollPatientResolver;
