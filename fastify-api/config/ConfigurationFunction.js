/*
This module exposes a function which returns a list of dynamic configs used by both mobile and web clients
*/
const config = require('./config.json'),
    pjson = require('../package.json'),
    {
        CONSTANTS: {
            FAMILY_APP_NAME,
            PUSH_NOTIFICATIONS_HASHING_ALGORITHM,
            PUSH_NOTIFICATIONS_BYTE_SIZE,
            PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM,
            VIBRATION_FREQUENCY,
            SOUND_ENABLED,
            SOUND_NAME,
            AUDIT_RETENTION_IN_DAYS_MIN,
            AUDIT_RETENTION_IN_DAYS_MAX,
            MAX_QUICK_MESSAGES,
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN,
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX,
            FAMILY_INVITES_COLLECTION_TTL_IN_SECS,
            FOSS_URL,
            MAX_LOCALIZED_QUICK_MESSAGES,
            SERVER_ENDPOINT_URL,
            B2C_CLIENT_ID,
            OAUTH_LOGIN_URL,
            OAUTH_SCOPED_BASE_URL,
            OAUTH_REDIRECT_URL,
            OAUTH_P_VALUE,
            MAX_FAMILY_MEMBER_LIMIT,
            LAST_SUPPORTED_VERSION,
            APP_STORE_URL,
            GOOGLE_PLAY_STORE_URL,
            VERSION_HEADER_NAME,
            EXTERNAL_ID_TYPES,
            DHP_URLS,
            OHANA_VERSION_1_4_0,
            OHANA_VERSION_1_3_0,
            OHANA_VERSION_1_2_0,
            OHANA_VERSION_1_1_0,
            MAX_SITE_WIDE_QUICK_MESSAGES,
            OHANA_VERSION_1_6_0,
            MAX_FIXED_CONTENTS,
            DEFAULT_LOG_LEVEL,
            DEFAULT_ADMIN_LOG_LEVEL,
            DEFAULT_MOBILE_LOG_LEVEL,
            OHANA_VERSION_1_7_0,
            OHANA_VERSION_1_8_0,
            OHANA_VERSION_1_9_0,
            LOGGING_BUFFER_MIN_LENGTH_IN_BYTES,
            FAMILY_RELATION_WITH_PATIENT
        },
        getLogger,
        gte
    } = require('ohana-shared'),
    fs = require('fs'),
    path = require('path');

const logger = getLogger('ConfigurationFunction');

async function configurationFunction(request, response) {
    logger.debug('ENTER:ConfigurationFunction');

    let result = {
        ...config,
        version: pjson.version,
        appName: FAMILY_APP_NAME,
        hashingAlgorithm: PUSH_NOTIFICATIONS_HASHING_ALGORITHM,
        byteSize: PUSH_NOTIFICATIONS_BYTE_SIZE,
        encryptionAlgorithm: PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM,
        vibration: VIBRATION_FREQUENCY,
        soundName: SOUND_NAME,
        soundEnabled: SOUND_ENABLED,
        auditRetentionInDaysMin: AUDIT_RETENTION_IN_DAYS_MIN,
        auditRetentionInDaysMax: AUDIT_RETENTION_IN_DAYS_MAX,
        maxQuickMessages: MAX_QUICK_MESSAGES,
        patientAutoUnenrollmentPeriodInHoursMin: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN,
        patientAutoUnenrollmentPeriodInHoursMax: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX,
        caregiverSessionInactivityInHoursMin: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN,
        caregiverSessionInactivityInHoursMax: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX,
        familyMemberSessionInactivityInMinutesMin: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN,
        familyMemberSessionInactivityInMinutesMax: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX,
        fossUrl: FOSS_URL,
        maxLocalizedQuickMessages: MAX_LOCALIZED_QUICK_MESSAGES,
        serverEndpointUrl: SERVER_ENDPOINT_URL,
        B2CClientId: B2C_CLIENT_ID,
        OAuthLoginUrl: OAUTH_LOGIN_URL,
        OAuthScopesBaseUrl: OAUTH_SCOPED_BASE_URL,
        OAuthRedirectUrl: OAUTH_REDIRECT_URL,
        OAuthPValue: OAUTH_P_VALUE
    };

    let version = request.headers[VERSION_HEADER_NAME];

    // this is the default value for the 1.0.0 release and will be removed once 1.0.0 is no longer supported
    if (!version) {
        version = '1.0.0';
    }

    if (gte(version, OHANA_VERSION_1_1_0)) {
        result = {
            ...result,
            maxFamilyMemberLimit: MAX_FAMILY_MEMBER_LIMIT,
            lastSupportedAppVersion: LAST_SUPPORTED_VERSION
        };
    }

    if (gte(version, OHANA_VERSION_1_2_0)) {
        result = {
            ...result,
            appStoreUrl: APP_STORE_URL,
            googlePlayStoreUrl: GOOGLE_PLAY_STORE_URL,
            dhpUrls: DHP_URLS
        };
    }

    if (gte(version, OHANA_VERSION_1_3_0)) {
        result = {
            ...result,
            externalIdTypes: EXTERNAL_ID_TYPES
        };
    }

    if (gte(version, OHANA_VERSION_1_4_0)) {
        let familyMemberPrivacyContent = '';
        let caregiverPrivacyContent = '';

        let familyMemberEulaContent = '';
        let caregiverEulaContent = '';

        try {
            familyMemberPrivacyContent = fs.readFileSync(
                path.resolve(__dirname, './family-member-privacy-notice.txt'),
                'utf-8'
            );
            caregiverPrivacyContent = fs.readFileSync(
                path.resolve(__dirname, './caregiver-privacy-notice.txt'),
                'utf-8'
            );
        } catch (error) {
            logger.error({error}, 'Error while reading privacy files');
        }

        try {
            familyMemberEulaContent = fs.readFileSync(
                path.resolve(__dirname, './family-member-eula.txt'),
                'utf-8'
            );
            caregiverEulaContent = fs.readFileSync(
                path.resolve(__dirname, './caregiver-eula.txt'),
                'utf-8'
            );
        } catch (error) {
            logger.error({error}, 'Error while reading privacy files');
        }

        result = {
            ...result,
            familyMemberPrivacyContent,
            caregiverPrivacyContent,
            familyMemberEulaContent,
            caregiverEulaContent
        };
    }

    if (gte(version, OHANA_VERSION_1_6_0)) {
        result = {
            ...result,
            maxSiteWideQuickMessages: MAX_SITE_WIDE_QUICK_MESSAGES,
            maxFixedContent: MAX_FIXED_CONTENTS
        };
    }

    if (gte(version, OHANA_VERSION_1_7_0)) {
        result = {
            ...result,
            defaultLogLevel: DEFAULT_LOG_LEVEL,
            defaultAdminLogLevel: DEFAULT_ADMIN_LOG_LEVEL,
            defaultMobileLogLevel: DEFAULT_MOBILE_LOG_LEVEL,
            loggingBufferMinLengthInBytes: LOGGING_BUFFER_MIN_LENGTH_IN_BYTES
        };
    }

    if (gte(version, OHANA_VERSION_1_8_0)) {
        result = {
            ...result,
            familyRelationWithPatient: FAMILY_RELATION_WITH_PATIENT
        };
    }

    if (gte(version, OHANA_VERSION_1_9_0)) {
        result = {
            ...result,
            familyInviteExpirationInSeconds: FAMILY_INVITES_COLLECTION_TTL_IN_SECS
        };
    }

    logger.debug('EXIT:ConfigurationFunction');

    response.code(200).send(result).header('Content-Type', 'application/json; charset=utf-8');
}

module.exports = {configurationFunction};
