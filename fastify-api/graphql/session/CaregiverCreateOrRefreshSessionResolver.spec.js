let resolver = null,
    ohanaSharedPackage = null;

const mockOhanaShared = (mockDisableCsaIntegration) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(),
        setRedisHashMap: jest.fn(() => true),
        getRedisHashMap: jest.fn(),
        createSession: jest.fn(() => 'i23u3t202232'),
        fetchCaregiverTenantIdentifier: jest.fn(() => {
            return {
                firstName: 'Vlad',
                lastName: 'Doe',
                userId: 'ee96bede-e658-4fbe-b483-4f8748242914',
                role: 'Administrator',
                title: 'Nurse',
                tenantId: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0'
            };
        }),
        upsertCaregiverUser: jest.fn(() => true),
        createDevice: jest.fn(() => true),
        getCaregiverByUserId: jest.fn(() => {
            return {
                id: '123',
                tenant: {
                    id: '12'
                },
                eulaAcceptTimestamp: new Date('2022-10-27T00:00:00.000Z'),
                mappedPatients: []
            };
        }),
        getTenantSettings: jest.fn(() => {
            return [
                {
                    key: 'sessionInactivityCaregiverInHours',
                    value: 13
                },
                {
                    key: 'sessionInactivityFamilyMemberInMinutes',
                    value: 5
                }
            ];
        }),
        getAllPatientsIdsByUser: jest.fn(() => []),
        writeLog: jest.fn(),
        csaTenantRegistration: jest.fn(),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared').CONSTANTS,
            DISABLE_CSA_INTEGRATION: mockDisableCsaIntegration
        }
    }));
};

beforeEach(() => {
    jest.mock('uuid', () => ({
        v4: jest.fn(() => 'i23u3t202232')
    }));
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('uuid');
});

const tenantShortCode = '0000';

describe('Given we want to resolve a GQL mutation to create or refresh a caregiver session', () => {
    describe('when valid data is provided', () => {
        test('then it should return a session', async () => {
            mockOhanaShared(false);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');

            const result = await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            );

            expect(result.user).toEqual(
                expect.objectContaining({
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    id: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    tenant: {id: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0'},
                    role: 'Administrator'
                })
            );
            expect(result.id).toBe('i23u3t202232');
            expect(ohanaSharedPackage.createSession).toHaveBeenCalledWith(
                'ee96bede-e658-4fbe-b483-4f8748242914',
                {
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    userId: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    title: 'Nurse',
                    tenantId: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0',
                    tenantShortCode,
                    deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                    deviceName: undefined,
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone SE',
                    sessionInactivityTimeoutInSecs: 46800,
                    role: 'ApprovedUser',
                    eulaAcceptTimestamp: new Date('2022-10-27T00:00:00.000Z'),
                    mappedPatients: []
                }
            );
        });
    });

    describe('when no caregiver tenant identity can be retrieved', () => {
        test('then it should throw', async () => {
            mockOhanaShared(false);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');
            ohanaSharedPackage.fetchCaregiverTenantIdentifier.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });

    describe('when caregiver data cannot be retrieved', () => {
        test('then it should return a session with accepted eula set to false', async () => {
            mockOhanaShared(false);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');
            ohanaSharedPackage.getCaregiverByUserId.mockImplementationOnce(() => null);

            const result = await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            );

            expect(result.user).toEqual(
                expect.objectContaining({
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    id: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    tenant: {id: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0'},
                    role: 'Administrator',
                    acceptedEula: false,
                    renewEula: false,
                    title: 'Nurse'
                })
            );
            expect(result.id).toBe('i23u3t202232');
            expect(ohanaSharedPackage.createSession).toHaveBeenCalledWith(
                'ee96bede-e658-4fbe-b483-4f8748242914',
                {
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    userId: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    title: 'Nurse',
                    tenantId: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0',
                    tenantShortCode,
                    deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                    deviceName: undefined,
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone SE',
                    sessionInactivityTimeoutInSecs: 46800,
                    role: 'ApprovedUser',
                    eulaAcceptTimestamp: null,
                    mappedPatients: []
                }
            );
        });
    });

    describe('when tenant settings cannot be retrieved', () => {
        test('then it should create a session with default sessionInactivityTimeoutInSecs', async () => {
            mockOhanaShared(false);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');
            ohanaSharedPackage.getTenantSettings.mockImplementationOnce(() => []);

            const result = await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            );

            expect(result.user).toEqual(
                expect.objectContaining({
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    id: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    tenant: {id: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0'},
                    role: 'Administrator',
                    acceptedEula: undefined,
                    title: 'Nurse'
                })
            );
            expect(result.id).toBe('i23u3t202232');
            expect(ohanaSharedPackage.createSession).toHaveBeenCalledWith(
                'ee96bede-e658-4fbe-b483-4f8748242914',
                {
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    userId: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    title: 'Nurse',
                    tenantId: 'fe64654b-0afa-4424-ba31-4e0f2857c2b0',
                    tenantShortCode,
                    deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                    deviceName: undefined,
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone SE',
                    sessionInactivityTimeoutInSecs: 43200,
                    role: 'ApprovedUser',
                    eulaAcceptTimestamp: new Date('2022-10-27T00:00:00.000Z'),
                    mappedPatients: []
                }
            );
        });
    });

    describe('when the CSA integration is enabled', () => {
        test('then it should call the registration function with appropriate inputs', async () => {
            mockOhanaShared(false);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');

            await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            );
            expect(ohanaSharedPackage.csaTenantRegistration).toHaveBeenCalledWith(
                tenantShortCode,
                'ee96bede-e658-4fbe-b483-4f8748242914'
            );
        });
    });

    describe('when the CSA integration is disabled', () => {
        test('then it should not call the registration function if the CSA integration is disabled', async () => {
            mockOhanaShared(true);
            resolver = require('./CaregiverCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');

            await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: tenantShortCode,
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE'
                    }
                },
                {}
            );
            expect(ohanaSharedPackage.csaTenantRegistration).not.toHaveBeenCalled();
        });
    });
});
