const {
        CONSTANTS: {
            REDIS_COLLECTIONS: {LOGIN_CHALLENGES},
            SESSION_REFRESH_TTL_IN_SECS,
            TENANT_SETTINGS_KEYS: {FAMILY_MEMBER_SESSION_INACTIVITY},
            MINUTES_TO_SECONDS_MULTIPLIER,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT,
            OHANA_ROLES: {FAMILY_MEMBER}
        },
        getRedisCollectionData,
        getFamilyMember,
        verifySignature,
        createDevice,
        createSessionTemplate,
        getTenantSettings,
        getLogger,
        createSession,
        NotFoundError,
        UnauthorizedError,
        getTenantShortCode
    } = require('ohana-shared'),
    {addSeconds} = require('date-fns');

async function AuthenticationResponseResolver(_parent, args, context) {
    const {
        challengeStringSigned,
        userId,
        device: {deviceId, osVersion, deviceModel, appVersion, deviceName}
    } = args;
    const logger = getLogger('AuthenticationResponseResolver', {...context, userId});

    const entry = await getRedisCollectionData(LOGIN_CHALLENGES, userId);
    if (!entry) {
        logger.error('Login challenge expired');
        throw new UnauthorizedError({description: 'Login challenge expired'});
    }

    const isSigned = verifySignature(entry.challengeString, challengeStringSigned, entry.publicKey);
    if (!isSigned) {
        logger.error('Signed challenge string does not match');
        throw new UnauthorizedError({description: 'Signed challenge string does not match'});
    }

    const familyMember = await getFamilyMember(userId);
    if (!familyMember) {
        logger.error('Family member not found');
        throw new NotFoundError({description: 'Family member not found'});
    }
    const {acceptedEula, ...payload} = familyMember;
    const {
        tenantId,
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        preferredLocale,
        eulaAcceptTimestamp,
        mappedPatients
    } = familyMember;

    logger.debug('Getting family member session inactivity time in seconds...');
    const tenantSettings = await getTenantSettings({tenantId});
    const familyMemberSessionInactivity = tenantSettings.find(
        (tenantSetting) => tenantSetting.key === FAMILY_MEMBER_SESSION_INACTIVITY
    );
    const sessionInactivityTimeoutInMinutesSetting =
        familyMemberSessionInactivity?.value || FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT;
    const sessionInactivityTimeoutInSecs =
        parseInt(sessionInactivityTimeoutInMinutesSetting) * MINUTES_TO_SECONDS_MULTIPLIER;

    logger.debug('Creating device...');
    await createDevice({deviceId, osVersion, deviceModel, userId, appVersion, deviceName});

    const tenantShortCode = await getTenantShortCode(tenantId);
    if (!tenantShortCode) {
        logger.warn({metadata: {tenantId}}, 'Missing short code for tenant');
    }

    const sessionId = await createSession(userId, {
        ...payload,
        tenantShortCode,
        deviceId,
        deviceName,
        osVersion,
        deviceModel,
        sessionInactivityTimeoutInSecs,
        role: FAMILY_MEMBER,
        assignedRoles: [FAMILY_MEMBER],
        mappedPatients,
        patientRelationship
    });

    return createSessionTemplate({
        id: sessionId,
        user: {
            id: userId,
            tenant: {id: tenantId},
            role: FAMILY_MEMBER,
            assignedRoles: [FAMILY_MEMBER],
            firstName,
            lastName,
            phoneNumber,
            patientRelationship,
            preferredLocale,
            acceptedEula,
            renewEula: !!eulaAcceptTimestamp,
            mappedPatients,
            invitedBy: familyMember.invitedBy
        },
        createdAt: new Date().toISOString(),
        expiresAt: addSeconds(new Date(), SESSION_REFRESH_TTL_IN_SECS).toISOString()
    });
}

module.exports = AuthenticationResponseResolver;
