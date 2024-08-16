const {
    CONSTANTS: {
        AUDIT_EVENTS: {INVITE_CLAIMED}
    }
} = require('ohana-shared');
let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(() => {
            return {
                challenge: 'challenge'
            };
        }),
        delRedisCollectionData: jest.fn(() => {}),
        createAuditEvent: jest.fn(() => true),
        createFamilyIdentity: jest.fn(() => 23),
        verifySignature: jest.fn(() => true),
        writeLog: jest.fn(() => {}),
        getPatientById: jest.fn(() => {
            return {location: {id: 1, label: 'Surgery'}};
        })
    }));

    resolver = require('./RegistrationResponseResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./RegistrationResponseResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation register a family member', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    challengeStringSigned: 'challenge',
                    invitationToken: 'uthaeuai1114',
                    publicKey: 'u82u8bf29'
                },
                {
                    version: '1.4.0',
                    buildNumber: '900'
                }
            );

            expect(result).toEqual(23);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: INVITE_CLAIMED,
                    userType: 'FamilyMember',
                    userDisplayName: null,
                    deviceId: null,
                    deviceModel: null,
                    osVersion: null,
                    version: '1.4.0',
                    buildNumber: '900',
                    locationId: 1
                })
            );
        });
    });

    describe('when the registration entry contains a phone number', () => {
        test('then it should return true', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                return {
                    challenge: 'challenge',
                    phoneNumber: '(234) 845-5558'
                };
            });

            const result = await resolver(
                null,
                {
                    challengeStringSigned: 'challenge',
                    invitationToken: 'uthaeuai1114',
                    publicKey: 'u82u8bf29'
                },
                {
                    version: '1.4.0',
                    buildNumber: '900'
                }
            );

            expect(result).toEqual(23);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: INVITE_CLAIMED,
                    userType: 'FamilyMember',
                    userDisplayName: null,
                    deviceId: null,
                    deviceModel: null,
                    osVersion: null,
                    version: '1.4.0',
                    buildNumber: '900',
                    locationId: 1,
                    familyContactNumber: '(234) 845-5558'
                })
            );
        });
    });

    describe('when signature cannot be validated', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.verifySignature.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    challengeStringSigned: 'challenge',
                    invitationToken: 'uthaeuai1114',
                    publicKey: 'u82u8bf29'
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

    describe('when no registration challenge exists', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    challengeStringSigned: 'challenge',
                    invitationToken: 'uthaeuai1114',
                    publicKey: 'u82u8bf29'
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('when no patient exists', () => {
        test('then the location for audit should be undefined', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);

            await resolver(
                null,
                {
                    challengeStringSigned: 'challenge',
                    invitationToken: 'uthaeuai1114',
                    publicKey: 'u82u8bf29'
                },
                {}
            );

            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    locationId: undefined
                })
            );
        });
    });
});
