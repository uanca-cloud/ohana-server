const {
    setRedisCollectionData,
    getRedisCollectionData,
    CONSTANTS: {
        REDIS_COLLECTIONS: {REGISTER_CHALLENGES, FAMILY_INVITES},
        REGISTER_CHALLENGES_COLLECTION_TTL_IN_SECS,
        TENANT_SETTINGS_KEYS: {FAMILY_MEMBER_LIMIT},
        DEFAULT_FAMILY_MEMBER_LIMIT
    },
    getChallenge,
    getFamilyMembersByPatientId,
    getTenantSetting,
    getLogger,
    UnauthorizedError
} = require('ohana-shared');

async function RegistrationChallengeResolver(_parent, args, context) {
    const logger = getLogger('RegistrationChallengeResolver', context);
    const {invitationToken} = args;

    let entry = await getRedisCollectionData(FAMILY_INVITES, invitationToken);
    // client apps redirect the user to link expired screen based on this code
    if (!entry) {
        logger.error('Link has expired');
        throw new UnauthorizedError({description: 'Link has expired'});
    }

    let challengeString = null;
    let phoneNumber = null;
    const familyMembers = await getFamilyMembersByPatientId(entry.patientId);

    const tenantMaxFamilyMembersOption = await getTenantSetting({
        key: FAMILY_MEMBER_LIMIT,
        tenantId: entry.tenantId
    });
    let tenantMaxFamilyMembers = tenantMaxFamilyMembersOption
        ? tenantMaxFamilyMembersOption.value
        : DEFAULT_FAMILY_MEMBER_LIMIT;

    if (familyMembers && familyMembers.length >= tenantMaxFamilyMembers) {
        logger.error('Family member list has exceeded the maximum allowed capacity');
        throw new UnauthorizedError({
            description: 'Family member list has exceeded the maximum allowed capacity'
        });
    }

    phoneNumber = entry.phoneNumber ? entry.phoneNumber : phoneNumber;
    challengeString = getChallenge();
    await setRedisCollectionData(
        REGISTER_CHALLENGES,
        REGISTER_CHALLENGES_COLLECTION_TTL_IN_SECS,
        invitationToken,
        {...entry, challengeString}
    );

    return {challengeString, phoneNumber};
}

module.exports = RegistrationChallengeResolver;
