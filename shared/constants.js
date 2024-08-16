//Process environment variables
const CONSTANTS = {
    HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
    PORT: process.env.PORT || 7071,
    DEFAULT_POOL_ACQUIRE_TIMEOUT_IN_MILLIS:
        process.env.DEFAULT_POOL_ACQUIRE_TIMEOUT_IN_MILLIS || 15000,
    PG_DEFAULT_MIN_POOL_SIZE: process.env.PG_DEFAULT_MIN_POOL_SIZE || 5,
    PG_DEFAULT_MAX_POOL_SIZE: process.env.PG_DEFAULT_MAX_POOL_SIZE || 10,
    PG_CONNECTION_TIMEOUT_IN_MILLIS: process.env.PG_CONNECTION_TIMEOUT_IN_MILLIS || 5000,
    PG_QUERY_LOG_LENGTH: 200,
    REDIS_CONNECTION_STRING: process.env.REDIS_CONNECTION_STRING || 'MISSING',
    SESSION_REDIS_COLLECTION_TTL_IN_SECS: process.env.SESSION_REDIS_COLLECTION_TTL_IN_SECS || 3600,
    USERS_REDIS_COLLECTION_TTL_IN_SECS: process.env.USERS_REDIS_COLLECTION_TTL_IN_SECS || 3600,
    FAMILY_INVITES_COLLECTION_TTL_IN_SECS: process.env.FAMILY_INVITES_COLLECTION_TTL_IN_SECS || 600,
    LOGIN_CHALLENGES_COLLECTION_TTL_IN_SECS:
        process.env.LOGIN_CHALLENGES_COLLECTION_TTL_IN_SECS || 600,
    REGISTER_CHALLENGES_COLLECTION_TTL_IN_SECS:
        process.env.REGISTER_CHALLENGES_COLLECTION_TTL_IN_SECS || 600,
    REDIS_DEFAULT_MIN_POOL_SIZE: process.env.REDIS_DEFAULT_MIN_POOL_SIZE || 0,
    REDIS_DEFAULT_MAX_POOL_SIZE: process.env.REDIS_DEFAULT_MAX_POOL_SIZE || 10,
    SESSION_REFRESH_TTL_IN_SECS: process.env.SESSION_REFRESH_TTL_IN_SECS || 1800,
    GQLWS_SUBSCRIPTIONS_REDIS_TTL_IN_SECS: 3600,
    LOGS_RETENTION_PERIOD_IN_DAYS: 7,
    PG_CONNECTION_STRING: process.env.PG_CONNECTION_STRING || 'MISSING',
    PG_LOGS_CONNECTION_STRING: process.env.PG_LOGS_CONNECTION_STRING || 'MISSING',
    PG_ADMIN_INTEGRATION_RUNNER: 'postgres://ohana_admin:ohana@localhost:5432/ohana',
    RMQ_ADMIN_INTEGRATION_RUNNER: 'amqp://admin:admin@localhost',
    RMQ_HTTP_API_INTEGRATION_BASE_URL: 'http://localhost:15672/api/',
    RMQ_HTTP_API_INTEGRATION_CREDENTIALS: 'admin:admin',
    LOAD_TEST_DUMMY_CREDENTIAL: 'ohana',
    PG_REPORTING_CONNECTION_STRING: process.env.PG_REPORTING_CONNECTION_STRING || null,
    PG_BATCH_SIZE: 100,
    PG_INSERT_BATCH_SIZE: 30,
    REDIS_BATCH_SIZE: 100,
    BRANCH_IO_KEY: process.env.BRANCH_IO_KEY || 'MISSING',
    AUTHENTICATION_HASHING_ALGORITHM: 'sha256',
    APP_CONFIG_CONNECTION_STRING: process.env.APP_CONFIG_CONNECTION_STRING || 'MISSING',

    RABBITMQ_RESOURCE_MANAGEMENT_URL: process.env.RABBITMQ_RESOURCE_MANAGEMENT_URL || 'MISSING',
    RABBITMQ_RESOURCE_MANAGEMENT_USER: process.env.RABBITMQ_RESOURCE_MANAGEMENT_USER || 'MISSING',
    RABBITMQ_RESOURCE_MANAGEMENT_PASS: process.env.RABBITMQ_RESOURCE_MANAGEMENT_PASS || 'MISSING',
    RABBITMQ_CONNECTION_STRING_CONSUMER:
        process.env.RABBITMQ_CONNECTION_STRING_CONSUMER || 'MISSING',
    RABBITMQ_CONNECTION_STRING_INFRA: process.env.RABBITMQ_CONNECTION_STRING_INFRA || 'MISSING',
    RABBITMQ_MIN_POOL_SIZE: process.env.RABBITMQ_MIN_POOL_SIZE || 1,
    RABBITMQ_MAX_POOL_SIZE: process.env.RABBITMQ_MAX_POOL_SIZE || 5,

    RABBITMQ_CONNECTION_POOLS: {
        HEALTH: 'health',
        INFRA: 'infra'
    },
    RABBITMQ_CONSUMER_NAME: 'consumer',
    RABBITMQ_DEFAULT_QUEUE: 'ohana.csa-watchChat',
    RABBITMQ_DEFAULT_EXCHANGE: 'csa-watchChat',
    CSA_WATCH_CHANNEL_FIELD: 'watchChannel',
    CHAT_CURSOR_PREFIX: 'order',
    RABBITMQ_POLICY_PREFIX: process.env.RABBITMQ_POLICY_PREFIX || 'p-csa-',
    RABBITMQ_FEDERATION_UPSTREAM_PREFIX:
        process.env.RABBITMQ_FEDERATION_UPSTREAM_PREFIX || 'fu-csa-',
    RABBITMQ_EXCHANGE_PREFIX: process.env.RABBITMQ_EXCHANGE_PREFIX || 'from-csa-',
    TENANTS_CHECK_INTERVAL_IN_MILLIS: process.env.TENANTS_CHECK_INTERVAL_IN_MILLIS || 3600000,

    HTTP_MIN_POOL_SIZE: process.env.HTTP_MIN_POOL_SIZE || 1,
    HTTP_MAX_POOL_SIZE: process.env.HTTP_MAX_POOL_SIZE || 1,

    HTTP_CONNECTION_POOLS: {
        CSA: 'csa',
        RMQ_API: 'rmq-api',
        DHP: 'dhp'
    },

    CSA_RABBITMQ_FQDN: process.env.CSA_RABBITMQ_FQDN || 'MISSING',
    CSA_SUPERGRAPH_URL: process.env.CSA_SUPERGRAPH_URL || 'MISSING',
    CSA_CLIENT_ID: process.env.CSA_CLIENT_ID || 'MISSING',
    CSA_PRODUCT_OID: process.env.CSA_PRODUCT_OID || 'MISSING',
    CSA_APP_CONFIG_KEY_PREFIX: 'CSA',

    DISABLE_CSA_MOCKING: process.env.DISABLE_CSA_INTEGRATION
        ? true
        : process.env.DISABLE_CSA_MOCKING || true,
    CSA_MOCKING_URL: process.env.CSA_MOCKING_URL || 'MISSING',

    REDIS_COLLECTIONS: {
        SESSION: 'sessions',
        REGISTER_CHALLENGES: 'register_challenge',
        LOGIN_CHALLENGES: 'login_challenge',
        FAMILY_INVITES: 'family_invites',
        CAREGIVER_UPDATES: 'caregiver_updates',
        CSA_CONFIGURED_TENANTS: 'csa_configured_tenants',
        CSA_REGISTERED_TENANTS: 'csa_registered_tenants',
        USERS_HASH: 'users',
        GQLWS_DISCONNECTIONS: 'gqlws:disconnections',
        GQLWS_COMPLETES: 'gqlws:completes'
    },
    AUDIT_REPORTS_STATUS_ENUM: {
        REPORT_PENDING: 'pending',
        REPORT_CANCELLED: 'cancelled',
        REPORT_COMPLETE: 'complete',
        REPORT_FAILED: 'failed'
    },
    NOTIFICATION_LEVELS: {
        MUTE: 'mute',
        LOUD: 'loud'
    },
    CHAT_UPDATE_TYPES: {
        CHAT_PATIENT_ENABLED_UPDATE: 'ChatPatientEnabledUpdate',
        CHAT_LOCATION_ENABLED_UPDATE: 'ChatLocationEnabledUpdate',
        NEW_CHAT_MESSAGE_UPDATE: 'NewChatMessageUpdate',
        READ_RECEIPT_UPDATE: 'ReadChatMessageUpdate',
        NOTIFICATION_LEVEL_UPDATE: 'NotificationLevelUpdate'
    },
    LATEST_SESSIONS_HASH: 'latest_sessions',
    TENANT_IDS_HASH: 'tenant_ids',
    PATIENT_CDR_ID_HASH: 'patient_cdr_id',
    BRANCH_IO_URL: process.env.BRANCH_IO_URL || 'MISSING',
    CHALLENGE_LENGTH: process.env.CHALLENGE_LENGTH || 20,
    FAMILY_APP_NAME: process.env.FAMILY_APP_NAME || 'Voalte Family',
    PUSH_NOTIFICATIONS_HASHING_ALGORITHM: process.env.NOTIFICATION_HASHING_ALGORITHM || 'sha256',
    PUSH_NOTIFICATIONS_IV_SIZE: process.env.NOTIFICATION_IV_SIZE || 16,
    PUSH_NOTIFICATIONS_BYTE_SIZE: process.env.NOTIFICATION_BYTE_SIZE || 16,
    PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM:
        process.env.NOTIFICATION_ENCRYPTION_ALGORITHM || 'aes-256-cbc',

    PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_TITLE: 'New Update',
    PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_TITLE: 'New Message',
    PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_BODY:
        'There is a new <%= mediaType %> from <%= firstName %><% if (title) { %>, <%= title %><% }  %>.',
    PUSH_NOTIFICATION_TEMPLATE_NEW_MESSAGE_BODY:
        'There is a new message from <%= firstName %><% if (patientRelationship) { %>, <%= patientRelationship %><% } else { %> <%= title %><% }%>.',
    PUSH_NOTIFICATION_DEFAULT_TEXT_MEDIA_NAME: 'update',
    PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL: 'Please contact the caregiver to reregister.',
    PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL: 'Your <%= appName %> session has ended.',

    ZENITH_B2C_BASE_INSTANCE_URL: process.env.ZENITH_B2C_BASE_INSTANCE_URL || 'MISSING',
    ZENITH_CAREGIVER_SITE_CODE_CHECK: process.env.ZENITH_CAREGIVER_SITE_CODE_CHECK || 'MISSING',
    ZENITH_LONG_TENANT_ID_CHECK: process.env.ZENITH_LONG_TENANT_ID_CHECK || 'MISSING',
    ZENITH_PATIENT_CHECK: process.env.ZENITH_PATIENT_CHECK || 'MISSING',
    ZENITH_ENCOUNTER_CHECK: process.env.ZENITH_ENCOUNTER_CHECK || 'MISSING',
    EXTERNAL_ID_TYPE_VISIT_NUMBER: 'Visit Number',
    EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE: 'VN',
    FAMILY_RELATIONS: process.env.FAMILY_RELATIONS ? JSON.parse(process.env.FAMILY_RELATIONS) : [],
    FAMILY_RELATION_WITH_PATIENT: process.env.FAMILY_RELATION_WITH_PATIENT || 'MISSING',
    EXTERNAL_ID_TYPES: process.env.EXTERNAL_ID_TYPES
        ? JSON.parse(process.env.EXTERNAL_ID_TYPES)
        : [],
    LOCALES: process.env.LOCALES ? JSON.parse(process.env.LOCALES) : [],
    DEFAULT_AZURE_LANGUAGE_CODE: 'en',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'AC-MISSING',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || 'MISSING',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
    UNENROLL_PATIENT_CRON_SCHEDULE: process.env.UNENROLL_PATIENT_CRON_SCHEDULE || '0 */1 * * * *',
    CLEANUP_CAREGIVER_ASSOCIATIONS_CRON_SCHEDULE:
        process.env.CLEANUP_CAREGIVER_ASSOCIATIONS_CRON_SCHEDULE || '0 */1 * * * *',
    VIBRATION_FREQUENCY: process.env.VIBRATION_FREQUENCY || 300,
    SOUND_NAME: process.env.SOUND_NAME || 'default',
    SOUND_ENABLED: process.env.SOUND_ENABLED === 'true',
    ZENITH_QUALIFIED_DOMAIN_NAME: process.env.ZENITH_QUALIFIED_DOMAIN_NAME || 'MISSING',
    AZURE_MEDIA_CONTAINER_NAME: process.env.AZURE_MEDIA_CONTAINER_NAME || 'MISSING',
    AZURE_AUDIT_CONTAINER_NAME: process.env.AZURE_AUDIT_CONTAINER_NAME || 'MISSING',
    AZURE_STORAGE_ACCOUNT_CONNECTION_STRING:
        process.env.AZURE_STORAGE_CONNECTION_STRING || 'MISSING',
    AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'MISSING',
    AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY || 'MISSING',
    ATTACHMENTS_BASE_URL: process.env.ATTACHMENTS_BASE_URL || 'MISSING',
    CLEANUP_ATTACHMENTS_CRON_SCHEDULE:
        process.env.CLEANUP_ATTACHMENTS_CRON_SCHEDULE || '0 */10 * * * *',
    THUMBNAIL_HEIGHT: process.env.THUMBNAIL_HEIGHT || 400,
    MAX_QUICK_MESSAGES: process.env.MAX_QUICK_MESSAGES || 25,
    MAX_LOCALIZED_QUICK_MESSAGES: process.env.MAX_LOCALIZED_QUICK_MESSAGES || 26,
    MAX_SITE_WIDE_QUICK_MESSAGES: process.env.MAX_SITE_WIDE_QUICK_MESSAGES || 25,
    MAX_FIXED_CONTENTS: process.env.MAX_FIXED_CONTENTS || 7,
    TEMPORARY_TOKEN_TTL_IN_SECS: process.env.TEMPORARY_TOKEN_TTL_IN_SECS || 60,
    APNS_EXPIRY_IN_SECS: process.env.APNS_EXPIRY_IN_SECS || 21600, // 6 hours
    OUTBOUND_CALL_FORMAT_DEFAULT: process.env.OUTBOUND_CALL_FORMAT_DEFAULT || 'MISSING',
    AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT:
        process.env.AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT || 90,
    AUDIT_RETENTION_IN_DAYS_MIN: process.env.AUDIT_RETENTION_IN_DAYS_MIN || 0,
    AUDIT_RETENTION_IN_DAYS_MAX: process.env.AUDIT_RETENTION_IN_DAYS_MAX || 365,
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT:
        process.env.CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT || 12,
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN:
        process.env.CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN || 1,
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX:
        process.env.CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX || 24,
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT:
        process.env.FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT || 5,
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN:
        process.env.FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN || 5,
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX:
        process.env.FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX || 60,
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT:
        process.env.PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT || 72,
    ALLOW_SECONDARY_FAMILY_MEMBERS_DEFAULT: process.env.ALLOW_SECONDARY_FAMILY_MEMBERS || 'true',
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN:
        process.env.PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN || 1,
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX:
        process.env.PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX || 720,
    CHAT_LOCATION_ENABLED_DEFAULT: process.env.CHAT_LOCATION_ENABLED_DEFAULT || 'false',
    DISABLE_ZENITH_VERIFICATION: process.env.DISABLE_ZENITH_VERIFICATION === 'true',
    DISABLE_BRANCHIO_INTEGRATION: process.env.DISABLE_BRANCHIO_INTEGRATION === 'true',
    DISABLE_CSA_INTEGRATION: process.env.DISABLE_CSA_INTEGRATION
        ? process.env.DISABLE_CSA_INTEGRATION === 'true'
        : true,
    ENABLE_STATIC_FM_AUTH_CHALLENGE: process.env.ENABLE_STATIC_FM_AUTH_CHALLENGE === 'true',
    STATIC_FM_AUTH_CHALLENGE_STRING: process.env.STATIC_FM_AUTH_CHALLENGE_STRING || 'MISSING',
    DISABLE_RATE_LIMITING: process.env.DISABLE_RATE_LIMITING === 'true' || false,
    TRANSLATION_RATE_LIMIT: process.env.TRANSLATION_RATE_LIMIT || 25,
    GENERATE_SMS_RATE_LIMIT: process.env.GENERATE_SMS_RATE_LIMIT || 15,
    RATE_LIMIT_EXPIRATION_IN_SEC: process.env.RATE_LIMIT_EXPIRATION_IN_SEC || 60,
    SERVER_ENDPOINT_URL: process.env.SERVER_ENDPOINT_URL || 'MISSING',
    B2C_CLIENT_ID: process.env.B2C_CLIENT_ID || 'MISSING',
    OAUTH_LOGIN_URL: process.env.OAUTH_LOGIN_URL || 'MISSING',
    OAUTH_SCOPED_BASE_URL: process.env.OAUTH_SCOPED_BASE_URL || 'MISSING',
    OAUTH_REDIRECT_URL: process.env.OAUTH_REDIRECT_URL || 'MISSING',
    OAUTH_P_VALUE: process.env.OAUTH_P_VALUE || 'MISSING',
    SERVICE_BUS_SMS_QUEUE_NAME: process.env.SERVICE_BUS_SMS_QUEUE_NAME || 'MISSING',
    SERVICE_BUS_AUDIT_QUEUE_NAME: process.env.SERVICE_BUS_AUDIT_QUEUE_NAME || 'MISSING',
    HOURS_TO_SECONDS_MULTIPLIER: 3600,
    MINUTES_TO_SECONDS_MULTIPLIER: 60,
    THUMBNAIL_PREFIX: 'thumb_',
    THUMBNAIL_COMPRESS_QUALITY: 80,
    BITS_PER_CHARACTER: 8,
    FOSS_URL: process.env.FOSS_URL || 'MISSING',
    DEFAULT_LOCALE: 'en_US',
    AUDIT_MAX_ARCHIVE_SIZE_IN_BYTES: 134217728, //128MB
    AUDIT_MAX_REPORTS_PER_USER: 10,
    AUDIT_POOL_REPORT_STATUS_INTERVAL_IN_MILLISECONDS: 1000,
    LAST_SUPPORTED_VERSION: '1.8.0',
    CURRENT_SERVER_VERSION: '2.0.0',
    VERSION_HEADER_NAME: 'x-ohana-version',
    BUILD_HEADER_NAME: 'x-ohana-build',
    DEFAULT_BUILD_NUMBER: '907', // mobile app build number for release-1.4
    MIN_FAMILY_MEMBER_LIMIT: 1,
    MAX_FAMILY_MEMBER_LIMIT: 15,
    DEFAULT_FAMILY_MEMBER_LIMIT: 10,
    DEFAULT_FAMILY_MEMBER_OLD_TENANTS_LIMIT: 1,
    CHANNEL_RESPONSE_LIMIT: 50,
    OHANA_VERSION_1_1_0: '1.1.0',
    OHANA_VERSION_1_2_0: '1.2.0',
    OHANA_VERSION_1_3_0: '1.3.0',
    OHANA_VERSION_1_4_0: '1.4.0',
    OHANA_VERSION_1_5_0: '1.5.0',
    OHANA_VERSION_1_6_0: '1.6.0',
    OHANA_VERSION_1_7_0: '1.7.0',
    OHANA_VERSION_1_8_0: '1.8.0',
    OHANA_VERSION_1_9_0: '1.9.0',
    OHANA_VERSION_1_9_1: '1.9.1',
    OHANA_VERSION_2_0_0: '2.0.0',
    SERVICE_BUS_LOGS_QUEUE_NAME: process.env.SERVICE_BUS_LOGS_QUEUE_NAME || 'MISSING',
    APP_STORE_URL: process.env.APP_STORE_URL || 'MISSING',
    GOOGLE_PLAY_STORE_URL: process.env.GOOGLE_PLAY_STORE_URL || 'MISSING',
    AUDIT_MAX_DATE_DIFFERENCE_IN_DAYS: 90,
    AUDIT_MIN_START_DATE: '2020-01-01',
    FREE_TEXT_FLAG_DEFAULT: process.env.FREE_TEXT_FLAG_DEFAULT
        ? process.env.FREE_TEXT_FLAG_DEFAULT === 'true'
        : true,
    MEDIA_ATTACHMENT_FLAG_DEFAULT: process.env.MEDIA_ATTACHMENT_FLAG_DEFAULT
        ? process.env.MEDIA_ATTACHMENT_FLAG_DEFAULT === 'true'
        : true,
    DHP_URLS: process.env.DHP_URLS ? JSON.parse(process.env.DHP_URLS) : [],
    FAMILY_MEMBER_ACCEPTED_INVITATION_UPDATE_TEMPLATE:
        "<%= firstName %> <%= lastName %> (<%= patientRelationship %>) has accepted <%= invitedByFirstName %>'s invitation",
    CAREGIVER_EULA_LAST_CHANGED_DATE: '2022-06-01T00:00:00.000Z',
    FAMILY_MEMBER_EULA_LAST_CHANGED_DATE: '2022-09-29T15:00:00.000Z',
    TRANSLATOR_SERVICE_KEY: process.env.TRANSLATOR_SERVICE_KEY || 'MISSING',
    TRANSLATOR_SERVICE_ENDPOINT: 'https://api.cognitive.microsofttranslator.com',
    TRANSLATOR_SERVICE_LOCATION: process.env.TRANSLATOR_SERVICE_LOCATION || 'MISSING',
    DISABLE_CLIENT_LOGS: process.env.DISABLE_CLIENT_LOGS
        ? process.env.DISABLE_CLIENT_LOGS === 'true'
        : false,
    BAXTER_ENV: process.env.BAXTER_ENV || 'local',
    WEB_PUBSUB_CONNECTION_STRING: process.env.WEB_PUBSUB_CONNECTION_STRING || 'MISSING',
    WEB_PUBSUB_HUB_NAME: process.env.WEB_PUBSUB_HUB_NAME || 'MISSING',
    WEB_PUBSUB_URL: process.env.WEB_PUBSUB_URL || 'MISSING',
    WEB_PUBSUB_PONG_TIMEOUT_IN_MILLIS: process.env.WEB_PUBSUB_PONG_TIMEOUT_IN_MILLIS || 6000,
    WEB_PUBSUB_PING_INTERVAL_IN_MILLIS: process.env.WEB_PUBSUB_PING_INTERVAL_IN_MILLIS || 12000,
    WEB_PUBSUB_TOKEN_VALIDITY_IN_MINS: process.env.WEB_PUBSUB_TOKEN_VALIDITY_IN_MINS || 60,
    WEB_PUBSUB_EVENT_HANDLER_PATH: '/eventhandler',
    WEBSOCKET_INIT_TIMEOUT_IN_MILLIS: process.env.WEBSOCKET_INIT_TIMEOUT_IN_MILLIS || 3000,
    CSA_SEED_PREFIX: 'vf:patient:',

    SUBSCRIPTION_TOPICS: {
        CHAT_UPDATES: 'CHAT_UPDATES',
        READ_RECEIPTS: 'READ_RECEIPTS'
    },

    AUDIT_EVENTS: {
        PATIENT_SCANNED: 'patient_scanned',
        INVITE_CLAIMED: 'invite_claimed',
        UPDATE_SET: 'update_sent',
        FAMILY_READ: 'family_read',
        FAMILY_ENROLLED: 'family_enrolled',
        FAMILY_UNENROLLED: 'family_unenrolled',
        FAMILY_INFO_EDITED: 'family_info_edited',
        PATIENT_PROFILE_VIEW: 'patient_profile_view',
        PATIENT_DETAILS_EDITED: 'patient_details_edited',
        PATIENT_DISASSOCIATED: 'patient_disassociated',
        CHAT_MESSAGE_SENT: 'message_sent',
        CHAT_MESSAGES_READ: 'message_read'
    },

    SCAN_STATUS: {
        NEW: 'New',
        EXISTING: 'Existing'
    },

    ZENITH_ROLES: {
        ADMINISTRATOR: 'Ohana Administrator',
        CAREGIVER: 'Ohana Client'
    },

    OHANA_ROLES: {
        ADMINISTRATOR: 'Administrator',
        CAREGIVER: 'ApprovedUser',
        FAMILY_MEMBER: 'FamilyMember'
    },

    AUDIT_REPORT_ROLES: {
        AUDIT_CAREGIVER: 'Caregiver',
        AUDIT_FAMILY_MEMBER: 'Family'
    },

    INVITATION_TYPES: {
        QR_CODE: 'QR_CODE',
        SMS: 'SMS',
        OTHER: 'OTHER'
    },

    FAMILY_MEMBER_TYPES: {
        PRIMARY: 'Primary',
        SECONDARY: 'Secondary'
    },

    /**
     * Log level priority used in filtering
     */
    LOG_LEVEL_PRIORITY: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },

    /**
     * Logging levels
     * @enum {string}
     */
    LOG_LEVELS: {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    },

    DEFAULT_LOG_LEVEL: process.env.DEFAULT_LOG_LEVEL || 'info',
    DEFAULT_ADMIN_LOG_LEVEL: process.env.DEFAULT_ADMIN_LOG_LEVEL || 'debug',
    DEFAULT_MOBILE_LOG_LEVEL: process.env.DEFAULT_MOBILE_LOG_LEVEL || 'debug',

    LOGGING_BUFFER_MIN_LENGTH_IN_BYTES: process.env.LOGGING_BUFFER_MIN_LENGTH_IN_BYTES || 65536,

    /**
     * Database connection pool options
     * @enum {string}
     */
    DB_CONNECTION_POOLS: {
        DEFAULT: 'default',
        HEALTH: 'health'
    },

    /**
     * Error code for known errors types
     * @enum {string}
     */
    ERROR_CODES: {
        CRASH_ERROR: 'crash.error',
        CRASH_EXIT: 'crash.exit',
        PARSE_ILLEGAL_CHARACTERS: 'parse.illegalCharacters',
        PARSE_SYNTAX_ERROR: 'parse.syntaxError',
        RESOLVER_UNKNOWN: 'resolver.unknown',
        RESOLVER_CRASH: 'resolver.crash',
        ACCESS_READ: 'access.read',
        ACCESS_WRITE: 'access_write',
        VALIDATION_SIZE_TOO_SHORT: 'validation.size.tooShort',
        VALIDATION_SIZE_TOO_LONG: 'validation.size.tooLong',
        VALIDATION_COUNT_TOO_FEW: 'validation.count.tooFew',
        VALIDATION_COUNT_TOO_MANY: 'validation.count.tooMany',
        VALIDATION_FORMAT: 'validation.format',
        VALIDATION_INVALID_CHOICE: 'validation.invalidChoice',
        VALIDATION_REQUIRED: 'validation.required',
        INTEGRITY_NOT_UNIQUE: 'integrity.nonUnique',
        INTEGRITY_COLLISION: 'integrity.collision',
        ENTITY_NOT_FOUND: 'entity.notFound',
        RESOURCE_UNAVAILABLE: 'resource.unavailable'
    },

    WEBSOCKET_CLOSE_CODES: {
        HOST_DISCONNECT: 1011,
        OTHER_HOST_DISCONNECT: 1012,
        SERVER_SHUTDOWN: 999
    },

    REDIS_CONNECTION_POOLS: {
        DEFAULT: 'default',
        HEALTH: 'health'
    },

    WHITELISTED_ROLES_TO_ENROLL_PATIENT: ['ApprovedUser', 'FamilyMember'],

    REDACTED_KEYS: [
        'id',
        'userId',
        'dateOfBirth',
        'patientDateOfBirth',
        'externalId',
        'patientId',
        'locationId',
        'firstName',
        'lastName',
        'invitedByFirstName',
        'invitedByLastName',
        'inviteeName',
        'inviteeRelationship',
        'patientRelationship',
        'thumbUrl',
        'originalUrl',
        'text',
        'encounterId',
        'updateId',
        'quickMessageId',
        'attachmentId',
        'userIds',
        'cdrId',
        'patientIds',
        'patientUlid',
        'chatUserIds',
        'recipientIds',
        'orderNumber',
        'deviceId'
    ],

    TENANT_SETTINGS_KEYS: {
        FREE_TEXT_FLAG: 'enableFreeText',
        MEDIA_ATTACHMENT_FLAG: 'enableMediaAttachment',
        EXTERNAL_ID_TYPE: 'externalIdType',
        OUTBOUND_CALL_FORMAT: 'outboundCallFormat',
        AUDIT_RETENTION: 'auditRetentionInDays',
        CAREGIVER_SESSION_INACTIVITY: 'sessionInactivityCaregiverInHours',
        FAMILY_MEMBER_SESSION_INACTIVITY: 'sessionInactivityFamilyMemberInMinutes',
        FAMILY_MEMBER_LIMIT: 'familyMemberLimit',
        ANALYTICS_FLAG: 'enableAnalytics',
        FREE_TEXT_TRANSLATION_FLAG: 'enableFreeTextTranslation'
    },

    LOCATION_SETTINGS_KEYS: {
        PATIENT_AUTO_UNENROLLMENT_IN_HOURS: 'patientAutoUnenrollmentInHours',
        ALLOW_SECONDARY_FAMILY_MEMBERS: 'allowSecondaryFamilyMembers',
        CHAT_LOCATION_ENABLED: 'chatLocationEnabled'
    },

    PUSH_NOTIFICATIONS_TYPES: {
        UNENROLL: 'UNENROLL',
        NEW_UPDATE: 'NEW_UPDATE',
        CHAT: 'CHAT',
        REMOVE_FAMILY_MEMBER: 'REMOVE_FAMILY_MEMBER'
    },

    MEDIA_TYPES: {
        TEXT: 'text',
        PHOTO: 'photo',
        QUICK_MESSAGE: 'quickMessage',
        USER_JOIN: 'userJoin'
    },

    IMAGE_TYPES: {
        JPG: {
            magicNumber: [0xff, 0xd8, 0xff], //ÿØÿà
            mimeType: 'image/jpeg',
            extension: 'jpg'
        },
        UNKNOWN: {
            magicNumber: [],
            mimeType: 'application/octet-stream',
            extension: null
        }
    },

    HEALTH_CHECK_SUCCESS_CODE: 200,
    HEALTH_CHECK_FAILURE_CODE: 502,
    SERVICE_BUS_HEALTH_QUEUE_NAME: 'servicebushealth',
    INTERNAL_ENVIRONMENTS: ['local', 'development', 'test', 'aut', 'hotfix'],
    EXTERNAL_ENVIRONMENTS: ['demo', 'stage', 'sandbox', 'prod'],
    DEBUG_LOGGING_ENVIRONMENTS: ['local', 'development', 'test', 'aut'],

    AUDIT_EVENT_REPORT_HEADERS: [
        'Event ID*',
        'Timestamp*',
        'Patient External ID*',
        'Patient Location',
        'Performing User Type*',
        'Performing User Display Name+',
        'Hospital User ID+',
        'Title',
        'Device ID+',
        'Device Model+',
        'OS Version+',
        'App Version and Build Number+',
        'Scan Status',
        'Update Content',
        'QM Translation(s)',
        'Free Text Translation(s)',
        'Update Attachments',
        'Invitation Type',
        'Family Display Name',
        'Family Relation',
        'Family Language',
        'Family Contact Number',
        'Family Member Type',
        'Message Content'
    ],

    TOGGLE_KEYS: {}
};

module.exports = {
    ...CONSTANTS
};
