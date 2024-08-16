const {
    fetchPatientInformationFromZenithAPI,
    getLocationSetting,
    getFamilyMembersByPatientId,
    CONSTANTS: {
        LOCATION_SETTINGS_KEYS: {ALLOW_SECONDARY_FAMILY_MEMBERS},
        TENANT_SETTINGS_KEYS: {FREE_TEXT_TRANSLATION_FLAG},
        PATIENT_CDR_ID_HASH,
        CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT
    },
    getTenantSetting,
    getUpdates,
    convertExternalIdTypeNameToId,
    ValidationError,
    setRedisCollectionData,
    formatCDRHashId,
    getPatientById,
    createPatientTemplate,
    getCaregiversByPatientId,
    checkExternalIdTypeOnTenant,
    getLogger
} = require('ohana-shared');

async function FindPatientInformationResolver(_parent, args, context) {
    const logger = getLogger('FindPatientInformationResolver', context);
    const {tenantId} = context;
    const {bearerToken, externalId, externalIdType} = args;

    if (!(await checkExternalIdTypeOnTenant(externalIdType, tenantId))) {
        logger.error('Invalid external id type for this tenant');
        throw new ValidationError({description: 'Invalid external id type for this tenant'});
    }

    const patient = await getPatientById({externalId, tenantId});

    if (patient) {
        const allowFreeTextTranslation = await getTenantSetting({
            key: FREE_TEXT_TRANSLATION_FLAG,
            tenantId
        });

        const updates = await getUpdates(patient.id, allowFreeTextTranslation);
        let familyMembers = await getFamilyMembersByPatientId(patient.id);
        const caregivers = await getCaregiversByPatientId(patient.id);

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

        return createPatientTemplate({
            ...patient,
            externalId,
            updates,
            familyMembers,
            allowSecondaryFamilyMembers,
            caregivers
        });
    } else {
        const patientInfo = await fetchPatientInformationFromZenithAPI(
            bearerToken,
            tenantId,
            externalId,
            externalIdType
        );

        if (patientInfo) {
            const externalIdTypeCode = convertExternalIdTypeNameToId(externalIdType);

            if (!externalIdTypeCode) {
                logger.error('Invalid external id type');
                throw new ValidationError({description: 'Invalid external id type'});
            }

            const id = formatCDRHashId(tenantId, externalId, externalIdTypeCode);
            const CAREGIVER_SESSION_INACTIVITY_IN_SECS_DEFAULT =
                parseInt(CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT) * 60 * 60;
            await setRedisCollectionData(
                PATIENT_CDR_ID_HASH,
                CAREGIVER_SESSION_INACTIVITY_IN_SECS_DEFAULT,
                id,
                {cdrId: patientInfo.cdrId}
            );

            return createPatientTemplate({
                firstName: patientInfo.firstName,
                lastName: patientInfo.lastName,
                dateOfBirth: patientInfo.dateOfBirth
            });
        }

        return null;
    }
}

module.exports = FindPatientInformationResolver;
