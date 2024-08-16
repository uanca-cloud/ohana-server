let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(() => {
            return {
                challenge: 'challenge',
                publicKey: 'test'
            };
        }),
        getRedisCollectionData: jest.fn(() => {
            return {
                challenge: 'challenge',
                publicKey: 'test'
            };
        }),
        getRedisHashMap: jest.fn(() => {}),
        setRedisHashMap: jest.fn(() => {}),
        getFamilyMember: jest.fn(() => {
            return {
                firstName: 'Vlad',
                lastName: 'Doe',
                patientRelationship: 'Uncle',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                userId: 10,
                tenantId: 1,
                role: 'FamilyMember'
            };
        }),
        verifySignature: jest.fn(() => true),
        createDevice: jest.fn(() => true),
        getTenantSettings: jest.fn(() => {
            return [
                {
                    key: 'sessionInactivityCaregiverInHours',
                    value: 12
                },
                {
                    key: 'sessionInactivityFamilyMemberInMinutes',
                    value: 5
                }
            ];
        }),
        createSession: jest.fn(() => 'i23u3t202232'),
        getTenantShortCode: jest.fn(() => '0000')
    }));

    resolver = require('./AuthenticationResponseResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to get a session', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    userId: 10,
                    challengeString: 'challenge',
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE',
                        appVersion: '1.0.0'
                    }
                },
                {}
            );

            expect(result.user).toEqual(
                expect.objectContaining({
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    patientRelationship: 'Uncle',
                    phoneNumber: '+511551',
                    preferredLocale: 'en_US',
                    id: 10,
                    tenant: {id: 1},
                    role: 'FamilyMember'
                })
            );
        });
    });

    describe('when invalid input is provided', () => {
        describe('when signature cannot be verified', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.verifySignature.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        userId: 10,
                        challengeString: 'challenge',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0'
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

        describe('when family member cannot be retrieved', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        userId: 10,
                        challengeString: 'challenge',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0'
                        }
                    },
                    {}
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('NOT_FOUND');
                    });
            });
        });
    });
});
