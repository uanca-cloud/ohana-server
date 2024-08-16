let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(() => {}),
        getFamilyMemberIdentity: jest.fn(() => {
            return {publicKey: 'test'};
        }),
        getChallenge: jest.fn(() => 'challenge'),
        writeLog: jest.fn(() => {})
    }));

    resolver = require('./AuthenticationChallengeResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get a challenge string', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(null, {
                userId: 1
            });

            expect(result).toBe('challenge');
        });
    });

    describe('when invalid family member is provided', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getFamilyMemberIdentity.mockImplementationOnce(() => null);

            resolver(null, {
                userId: 1
            })
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });
});
