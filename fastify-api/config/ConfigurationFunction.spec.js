const {
    CONSTANTS: {VERSION_HEADER_NAME},
    pjson = require('../package.json')
} = require('ohana-shared');

let request = {},
    response = {},
    configurationFunction,
    configurationObject = {
        BARCODE_FORMATS: [
            'ean13Upca',
            'upce',
            'ean8',
            'code39',
            'code93',
            'code128',
            'codabar',
            'interleavedTwoOfFive',
            'upca'
        ],
        version: pjson.version,
        appName: 'Voalte Family',
        hashingAlgorithm: 'sha256',
        byteSize: 16,
        encryptionAlgorithm: 'aes-256-cbc',
        vibration: 300,
        soundName: 'default',
        soundEnabled: false,
        auditRetentionInDaysMin: 0,
        auditRetentionInDaysMax: 365,
        maxQuickMessages: 25,
        patientAutoUnenrollmentPeriodInHoursMin: 1,
        patientAutoUnenrollmentPeriodInHoursMax: 720,
        caregiverSessionInactivityInHoursMin: 1,
        caregiverSessionInactivityInHoursMax: 24,
        familyMemberSessionInactivityInMinutesMin: 5,
        familyMemberSessionInactivityInMinutesMax: 60,
        fossUrl: 'MISSING',
        maxLocalizedQuickMessages: 26,
        serverEndpointUrl: 'MISSING',
        B2CClientId: 'MISSING',
        OAuthLoginUrl: 'MISSING',
        OAuthScopesBaseUrl: 'MISSING',
        OAuthRedirectUrl: 'MISSING',
        OAuthPValue: 'MISSING'
    };

beforeEach(() => {
    jest.mock('fs');

    request = {
        method: 'GET',
        headers: {
            [VERSION_HEADER_NAME]: '1.7.0'
        }
    };

    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis()
    };

    configurationFunction = require('./ConfigurationFunction').configurationFunction;
});

afterEach(() => {
    jest.unmock('fs');
});

describe('Given we want to get the configuration values', () => {
    describe('and the app version is not sent', () => {
        test('then it should return status 200 and the default configuration object', async () => {
            request.headers = {};
            await configurationFunction(request, response);

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.1.0', () => {
        test('then it should return status 200 and the configuration object with the 1.1.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.1.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0'
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.2.0', () => {
        test('then it should return status 200 and the configuration object with the 1.2.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.2.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: []
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.3.0', () => {
        test('then it should return status 200 and the configuration object with the 1.3.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.3.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: [],
                externalIdTypes: []
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.4.0', () => {
        test('then it should return status 200 and the configuration object with the 1.3.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.4.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: [],
                externalIdTypes: [],
                familyMemberPrivacyContent: undefined,
                caregiverPrivacyContent: undefined,
                familyMemberEulaContent: undefined,
                caregiverEulaContent: undefined
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.7.0', () => {
        test('then it should return status 200 and the configuration object with the 1.3.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.7.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: [],
                externalIdTypes: [],
                familyMemberPrivacyContent: undefined,
                caregiverPrivacyContent: undefined,
                familyMemberEulaContent: undefined,
                caregiverEulaContent: undefined,
                maxSiteWideQuickMessages: 25,
                maxFixedContent: 7,
                defaultLogLevel: 'info',
                defaultAdminLogLevel: 'debug',
                defaultMobileLogLevel: 'debug',
                loggingBufferMinLengthInBytes: 65536
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.8.0', () => {
        test('then it should return status 200 and the configuration object with the 1.3.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.8.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: [],
                externalIdTypes: [],
                familyMemberPrivacyContent: undefined,
                caregiverPrivacyContent: undefined,
                familyMemberEulaContent: undefined,
                caregiverEulaContent: undefined,
                maxSiteWideQuickMessages: 25,
                maxFixedContent: 7,
                defaultLogLevel: 'info',
                defaultAdminLogLevel: 'debug',
                defaultMobileLogLevel: 'debug',
                familyRelationWithPatient: 'MISSING'
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });

    describe('and the app version is 1.9.0', () => {
        test('then it should return status 200 and the configuration object with the 1.9.0 values', async () => {
            request.headers = {
                [VERSION_HEADER_NAME]: '1.9.0'
            };

            await configurationFunction(request, response);
            configurationObject = {
                ...configurationObject,
                maxFamilyMemberLimit: 15,
                lastSupportedAppVersion: '1.8.0',
                appStoreUrl: 'MISSING',
                googlePlayStoreUrl: 'MISSING',
                dhpUrls: [],
                externalIdTypes: [],
                familyMemberPrivacyContent: undefined,
                caregiverPrivacyContent: undefined,
                familyMemberEulaContent: undefined,
                caregiverEulaContent: undefined,
                maxSiteWideQuickMessages: 25,
                maxFixedContent: 7,
                defaultLogLevel: 'info',
                defaultAdminLogLevel: 'debug',
                defaultMobileLogLevel: 'debug',
                familyRelationWithPatient: 'MISSING',
                familyInviteExpirationInSeconds: 600
            };

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(configurationObject);
        });
    });
});
