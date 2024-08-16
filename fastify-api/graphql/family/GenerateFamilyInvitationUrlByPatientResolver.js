const {
    CONSTANTS: {
        OHANA_ROLES: {FAMILY_MEMBER}
    },
    getFamilyInvitationUrl,
    hasOpenEncounter,
    UnauthorizedError,
    ForbiddenError,
    getPatientById,
    getLogger,
    isUserMappedToPatient,
    isAllowSecondaryFamilyMemberForPatient
} = require('ohana-shared');

async function GenerateFamilyInvitationUrlByPatientResolver(_parent, args, context) {
    const logger = getLogger('GenerateFamilyInvitationUrlByPatientResolver', context);
    const {tenantId, userId, role, mappedPatients} = context;
    let {patientId} = args;
    const metadata = {...logger.bindings()?.metadata, patientId, tenantId};

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error({metadata}, 'Encounter has ended!');
        throw new UnauthorizedError({description: 'Encounter has ended!'});
    }

    if (role === FAMILY_MEMBER && !(await isAllowSecondaryFamilyMemberForPatient(patientId))) {
        logger.error({metadata}, 'Family member is not authorized to invite a new family member');
        throw new ForbiddenError({
            message: 'Family member is not authorized to invite a new family member'
        });
    }

    const patient = await getPatientById({id: patientId, tenantId});
    let familyInvitationUrl = null;
    if (patient) {
        if (!(await isUserMappedToPatient({userId, tenantId}, patient.id, mappedPatients))) {
            logger.error(
                {metadata},
                'Cannot invite a new family member for a patient you are not mapped to'
            );
            throw new ForbiddenError({
                message: 'Cannot invite a new family member for a patient you are not mapped to'
            });
        }
        familyInvitationUrl = await getFamilyInvitationUrl({
            patientId,
            tenantId,
            invitedBy: userId,
            role
        });

        logger.debug({metadata}, 'Family invitation sent via url by patient successfully.');
    }

    if (!familyInvitationUrl) {
        logger.error({metadata}, 'Error while generating family invitation url');
        throw new Error('Error while generating family invitation url');
    }

    return familyInvitationUrl;
}

module.exports = GenerateFamilyInvitationUrlByPatientResolver;
