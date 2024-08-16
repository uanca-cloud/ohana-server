let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(() => {}),
        getRedisCollectionData: jest.fn(() => {
            return {
                phoneNumber: '751729271',
                encounterId: 1,
                tenantId: 1
            };
        }),
        getTenantSetting: jest.fn(() => ({value: 2})),
        getChallenge: jest.fn(() => 'challenge'),
        getFamilyMembersByPatientId: jest.fn(() => [
            {userId: '59325', firstName: 'test', lastName: 'test'}
        ]),
        writeLog: jest.fn(() => {}),
        getLogger: jest.fn(() => {
            return {
                debug: jest.fn(),
                error: jest.fn()
            };
        })
    }));

    resolver = require('./RegistrationChallengeResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./RegistrationChallengeResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get a registration challenge string', () => {
    describe('when valid input is provided', () => {
        describe('when a phone number exists', () => {
            test('then it should return the registration object with the phone number', async () => {
                const result = await resolver(
                    null,
                    {
                        invitationToken: 'ghjahfhfaeiuhe218u'
                    },
                    {version: '1.1.0'}
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        challengeString: 'challenge',
                        phoneNumber: '751729271'
                    })
                );
            });
        });

        describe('when a phone number does not exist', () => {
            test('then it should return the registration object without the phone number', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                    return {
                        encounterId: 1,
                        tenantId: 1
                    };
                });

                const result = await resolver(
                    null,
                    {
                        invitationToken: 'ghjahfhfaeiuhe218u'
                    },
                    {version: '1.1.0'}
                );

                expect(result).toEqual(
                    expect.objectContaining({challengeString: 'challenge', phoneNumber: null})
                );
            });
        });
    });

    describe('when no entry can be retrieved', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    invitationToken: 'ghjahfhfaeiuhe218u'
                },
                {version: '1.1.0'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });

    describe('when the family members limit has been reached', () => {
        describe('and the value for the tenant max family members exists', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementationOnce(() => [0, 0]);

                resolver(
                    null,
                    {
                        invitationToken: 'ghjahfhfaeiuhe218u'
                    },
                    {version: '1.1.0'}
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('UNAUTHORIZED');
                    });
            });
        });

        describe('and the value for the tenant max family members does not exist', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() => null);
                ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementationOnce(() => [
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                ]);

                resolver(
                    null,
                    {
                        invitationToken: 'ghjahfhfaeiuhe218u'
                    },
                    {version: '1.1.0'}
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('UNAUTHORIZED');
                    });
            });
        });
    });
});
