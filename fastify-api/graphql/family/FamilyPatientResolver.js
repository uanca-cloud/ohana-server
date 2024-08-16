const {
    createPatientTemplate,
    getPatientsByUser,
    getUpdates,
    NotFoundError,
    getLogger,
    getLocationSetting,
    CONSTANTS: {
        LOCATION_SETTINGS_KEYS: {ALLOW_SECONDARY_FAMILY_MEMBERS},
        TENANT_SETTINGS_KEYS: {FREE_TEXT_TRANSLATION_FLAG}
    },
    getFamilyMembersByPatientId,
    getTenantSetting,
    getCaregiversByPatientId
} = require('ohana-shared');

async function FamilyPatientResolver(_parent, _args, context) {
    const logger = getLogger('FamilyPatientResolver', context);
    const {userId, tenantId} = context;

    const patients = await getPatientsByUser({userId, tenantId});
    if (!patients.length) {
        logger.error('Patient not found');
        throw new NotFoundError({description: 'Patient not found'});
    }

    const patient = patients[0];
    const allowFreeTextTranslation = await getTenantSetting({
        key: FREE_TEXT_TRANSLATION_FLAG,
        tenantId
    });
    const updates = await getUpdates(patient.id, allowFreeTextTranslation);
    let familyMembers = await getFamilyMembersByPatientId(patient.id);

    familyMembers = familyMembers.map((familyMember) => {
        familyMember.createdAt = familyMember.createdAt
            ? familyMember.createdAt.toISOString()
            : null;
        return familyMember;
    });

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
        updates,
        familyMembers,
        allowSecondaryFamilyMembers,
        caregivers
    });
}

module.exports = FamilyPatientResolver;
