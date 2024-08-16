const {
    getRedisCollectionData,
    delRedisCollectionData,
    CONSTANTS: {
        REDIS_COLLECTIONS: {REGISTER_CHALLENGES, FAMILY_INVITES},
        AUDIT_EVENTS: {INVITE_CLAIMED},
        INVITATION_TYPES: {SMS, QR_CODE, OTHER},
        OHANA_ROLES: {CAREGIVER},
        FAMILY_MEMBER_TYPES: {PRIMARY, SECONDARY}
    },
    createFamilyIdentity,
    createAuditEvent,
    getLogger,
    getPatientById,
    verifySignature,
    ForbiddenError,
    UnauthorizedError
} = require('ohana-shared');

async function RegistrationResponseResolver(_parent, args, context) {
    const logger = getLogger('RegistrationResponseResolver', context);
    const {version, buildNumber} = context;
    const {invitationToken, challengeStringSigned, publicKey} = args;

    const entry = await getRedisCollectionData(REGISTER_CHALLENGES, invitationToken);
    //this error should never occur
    if (!entry) {
        logger.error('Register challenge expired');
        throw new ForbiddenError({message: 'Register challenge expired'});
    }

    // client apps redirect the user to link expired screen based on this code
    const isSigned = verifySignature(entry.challengeString, challengeStringSigned, publicKey);

    if (!isSigned) {
        logger.error('Signed challenge string does not match');
        throw new UnauthorizedError({description: 'Signed challenge string does not match'});
    }

    const userId = await createFamilyIdentity(
        {...entry, isPrimary: entry.role === CAREGIVER},
        publicKey
    );

    const invitationType = entry.phoneNumber ? SMS : entry.role === CAREGIVER ? QR_CODE : OTHER;

    const patient = await getPatientById({id: entry.patientId, tenantId: entry.tenantId});

    await createAuditEvent({
        eventId: INVITE_CLAIMED,
        patientId: entry.patientId,
        userType: 'FamilyMember',
        userDisplayName: null,
        deviceId: null,
        deviceModel: null,
        osVersion: null,
        version,
        buildNumber,
        tenantId: entry.tenantId,
        invitationType,
        familyMemberType: entry.role === CAREGIVER ? PRIMARY : SECONDARY,
        locationId: patient?.location?.id,
        familyContactNumber: entry.phoneNumber,
        externalId: patient?.externalId
    });

    await delRedisCollectionData(FAMILY_INVITES, invitationToken);

    return userId;
}

module.exports = RegistrationResponseResolver;
