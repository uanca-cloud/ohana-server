const {
        fetchAdminIdentity,
        setRedisCollectionData,
        CONSTANTS: {
            REDIS_COLLECTIONS: {SESSION},
            SESSION_REDIS_COLLECTION_TTL_IN_SECS,
            SESSION_REFRESH_TTL_IN_SECS,
            EXTERNAL_ID_TYPES,
            OUTBOUND_CALL_FORMAT_DEFAULT,
            AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT,
            DEFAULT_FAMILY_MEMBER_LIMIT,
            TENANT_SETTINGS_KEYS: {
                EXTERNAL_ID_TYPE,
                OUTBOUND_CALL_FORMAT,
                AUDIT_RETENTION,
                CAREGIVER_SESSION_INACTIVITY,
                FAMILY_MEMBER_SESSION_INACTIVITY,
                FAMILY_MEMBER_LIMIT,
                FREE_TEXT_FLAG,
                MEDIA_ATTACHMENT_FLAG,
                ANALYTICS_FLAG,
                FREE_TEXT_TRANSLATION_FLAG
            },
            FREE_TEXT_FLAG_DEFAULT,
            MEDIA_ATTACHMENT_FLAG_DEFAULT,
            DISABLE_CSA_INTEGRATION
        },
        createSessionTemplate,
        upsertAdminUser,
        insertDefaultTenantSettings,
        getLogger,
        UnauthorizedError,
        fetchTenantShortCode,
        csaTenantRegistration
    } = require('ohana-shared'),
    {addSeconds} = require('date-fns'),
    {v4: uuid} = require('uuid');

async function AdminCreateOrRefreshSessionResolver(_parent, args, context) {
    const logger = getLogger('AdminCreateOrRefreshSession', context);
    const {bearerToken, tenantId} = args;
    const metadata = {...logger.bindings()?.metadata, tenantId};

    const identity = await fetchAdminIdentity(bearerToken);

    if (!identity) {
        logger.error({metadata}, 'Could not fetch identity');
        throw new UnauthorizedError({description: 'Could not fetch identity'});
    }
    const {userId, role, firstName, lastName, title, assignedRoles} = identity;
    let tenantShortCode;

    if (!DISABLE_CSA_INTEGRATION) {
        tenantShortCode = await fetchTenantShortCode(bearerToken, tenantId);
        tenantShortCode = tenantShortCode?.toUpperCase();
        await csaTenantRegistration(tenantShortCode, userId);
    }

    const sessionId = uuid();
    await setRedisCollectionData(SESSION, SESSION_REDIS_COLLECTION_TTL_IN_SECS, sessionId, {
        ...identity,
        tenantId,
        tenantShortCode
    });

    await upsertAdminUser({userId, tenantId, assignedRoles, firstName, lastName});

    if (!EXTERNAL_ID_TYPES.length) {
        logger.warn({metadata}, 'External id types list is empty');
    }

    const defaultExternalIdType = EXTERNAL_ID_TYPES[0] ? EXTERNAL_ID_TYPES[0].key : null;

    await insertDefaultTenantSettings([
        {tenantId, key: EXTERNAL_ID_TYPE, value: defaultExternalIdType},
        {tenantId, key: OUTBOUND_CALL_FORMAT, value: OUTBOUND_CALL_FORMAT_DEFAULT || null},
        {tenantId, key: AUDIT_RETENTION, value: AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT || null},
        {
            tenantId,
            key: CAREGIVER_SESSION_INACTIVITY,
            value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT || null
        },
        {
            tenantId,
            key: FAMILY_MEMBER_SESSION_INACTIVITY,
            value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT || null
        },
        {tenantId, key: FREE_TEXT_FLAG, value: FREE_TEXT_FLAG_DEFAULT || null},
        {tenantId, key: MEDIA_ATTACHMENT_FLAG, value: MEDIA_ATTACHMENT_FLAG_DEFAULT || null},
        {tenantId, key: ANALYTICS_FLAG, value: true},
        {tenantId, key: FREE_TEXT_TRANSLATION_FLAG, value: true}
    ]);

    await insertDefaultTenantSettings([
        {tenantId, key: FAMILY_MEMBER_LIMIT, value: DEFAULT_FAMILY_MEMBER_LIMIT || null}
    ]);

    return createSessionTemplate({
        id: sessionId,
        user: {
            title,
            firstName,
            lastName,
            id: userId,
            tenant: {id: tenantId},
            role,
            assignedRoles
        },
        createdAt: new Date().toISOString(),
        expiresAt: addSeconds(new Date(), SESSION_REFRESH_TTL_IN_SECS).toISOString()
    });
}

module.exports = AdminCreateOrRefreshSessionResolver;
