const {
        fetchCaregiverTenantIdentifier,
        CONSTANTS: {
            SESSION_REFRESH_TTL_IN_SECS,
            TENANT_SETTINGS_KEYS: {CAREGIVER_SESSION_INACTIVITY},
            HOURS_TO_SECONDS_MULTIPLIER,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT,
            DISABLE_CSA_INTEGRATION,
            OHANA_ROLES: {CAREGIVER}
        },
        createSessionTemplate,
        createDevice,
        upsertCaregiverUser,
        getTenantSettings,
        UnauthorizedError,
        getLogger,
        createSession,
        getCaregiverByUserId,
        getAllPatientsIdsByUser,
        csaTenantRegistration
    } = require('ohana-shared'),
    {addSeconds} = require('date-fns');

async function CaregiverCreateOrRefreshSessionResolver(_parent, args, context) {
    const logger = getLogger('CaregiverCreateOrRefreshSession', context);
    const {
        bearerToken,
        tenantId: shortCode,
        device: {deviceId, deviceName, osVersion, deviceModel, appVersion}
    } = args;

    const identity = await fetchCaregiverTenantIdentifier(bearerToken, shortCode);
    if (!identity) {
        logger.error('Could not fetch identity');
        throw new UnauthorizedError({description: 'Could not fetch identity'});
    }

    const {userId, role, firstName, lastName, title, tenantId, email, assignedRoles} = identity;

    if (!DISABLE_CSA_INTEGRATION) {
        await csaTenantRegistration(shortCode.toUpperCase(), userId);
    }

    const tenantSettings = await getTenantSettings({tenantId});
    const sessionInactivityCaregiverInHours = tenantSettings.find(
        (tenantSetting) => tenantSetting.key === CAREGIVER_SESSION_INACTIVITY
    );
    const sessionInactivityCaregiverInHoursSetting =
        sessionInactivityCaregiverInHours?.value || CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT;
    const sessionInactivityTimeoutInSecs =
        parseInt(sessionInactivityCaregiverInHoursSetting) * HOURS_TO_SECONDS_MULTIPLIER;

    await upsertCaregiverUser({
        userId,
        tenantId,
        firstName,
        lastName,
        title,
        email,
        assignedRoles
    });

    await createDevice({deviceId, deviceName, osVersion, deviceModel, userId, appVersion});

    const user = await getCaregiverByUserId(userId);

    const mappedPatients = await getAllPatientsIdsByUser(identity);

    const sessionId = await createSession(userId, {
        ...identity,
        tenantId,
        tenantShortCode: shortCode.toUpperCase(),
        deviceId,
        deviceName,
        osVersion,
        deviceModel,
        sessionInactivityTimeoutInSecs,
        role: CAREGIVER,
        assignedRoles,
        eulaAcceptTimestamp: user ? user.eulaAcceptTimestamp : null,
        mappedPatients
    });

    return createSessionTemplate({
        id: sessionId,
        user: {
            title,
            firstName,
            lastName,
            id: userId,
            tenant: {id: tenantId},
            role,
            assignedRoles,
            acceptedEula: user ? user.acceptedEula : false,
            renewEula: !!user?.eulaAcceptTimestamp
        },
        createdAt: new Date().toISOString(),
        expiresAt: addSeconds(new Date(), SESSION_REFRESH_TTL_IN_SECS).toISOString()
    });
}

module.exports = CaregiverCreateOrRefreshSessionResolver;
