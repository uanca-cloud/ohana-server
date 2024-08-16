const mockOhanaShared = (mockDisableBRanchIo) => {
        jest.mock('./constants', () => ({
            REDIS_COLLECTIONS: {FAMILY_INVITES: 'family_invites'},
            FAMILY_INVITES_COLLECTION_TTL_IN_SECS: 600,
            DISABLE_BRANCHIO_INTEGRATION: mockDisableBRanchIo
        }));
    },
    {
        invitationFixtures: {familyInvitation1}
    } = require('./test/fixtures/InvitationFixtures');

let gateway = null,
    genMockUrl = null,
    genBranchUrl = null;

beforeEach(() => {
    jest.mock('./RedisGateway', () => ({
        setRedisHashMap: jest.fn(() => Promise.resolve()),
        getRedisHashMap: jest.fn(() =>
            Promise.resolve(
                JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: ['2862830d-c074-4d8f-9902-76ccb54a9cea']
                })
            )
        ),
        setRedisCollectionData: jest.fn(() => Promise.resolve())
    }));

    jest.mock('./test/InvitationLinkingMockService', () => {
        return {
            generateMockUrl: jest.fn(() => {
                return 'http://vf.hrdev.io?invite=mock-82b4a340-7856-4cb4-ad23-7486626b63c7';
            })
        };
    });

    jest.mock('./BranchIoService', () => {
        return {
            generateBranchIoUrl: jest.fn(() => {
                return 'http://vf.hrdev.io?invite=branch-82b4a340-7856-4cb4-ad23-7486626b63c7';
            })
        };
    });

    jest.mock('uuid', () => {
        return {
            v4: () => '82b4a340-7856-4cb4-ad23-7486626b63c7'
        };
    });

    gateway = require('./RedisGateway');
    genMockUrl = require('./test/InvitationLinkingMockService');
    genBranchUrl = require('./BranchIoService');
});

afterEach(() => {
    jest.unmock('./RedisGateway');
    jest.unmock('uuid');
    jest.unmock('./test/InvitationLinkingMockService');
    jest.unmock('./BranchIoService');
    jest.unmock('./constants');
});

describe('Given we want to generate a new family invite url when DISABLE_BRANCHIO_INTEGRATION is true', () => {
    describe('when a correct payload is passed', () => {
        test('then setRedisCollectionData should be called', async () => {
            const mockDisableBRanchIo = true;
            mockOhanaShared(mockDisableBRanchIo);
            const {getFamilyInvitationUrl} = require('./FamilyInvitationHelper');
            await getFamilyInvitationUrl(familyInvitation1);

            await expect(gateway.setRedisCollectionData).toHaveBeenCalledTimes(1);
        });
        test('then a unique url should be generated with generateMockUrl', async () => {
            const mockDisableBranchIo = true;
            mockOhanaShared(mockDisableBranchIo);
            const {getFamilyInvitationUrl} = require('./FamilyInvitationHelper');
            const response = await getFamilyInvitationUrl(familyInvitation1);

            await expect(genMockUrl.generateMockUrl).toHaveBeenCalledTimes(1);
            await expect(genBranchUrl.generateBranchIoUrl).toHaveBeenCalledTimes(0);
            await expect(response).toEqual(
                'http://vf.hrdev.io?invite=mock-82b4a340-7856-4cb4-ad23-7486626b63c7'
            );
        });
    });
});

describe('Given we want to generate a new family invite url when DISABLE_BRANCHIO_INTEGRATION is false', () => {
    describe('when a correct payload is passed', () => {
        test('then setRedisCollectionData should be called', async () => {
            const mockDisableBranchIo = false;
            mockOhanaShared(mockDisableBranchIo);
            const {getFamilyInvitationUrl} = require('./FamilyInvitationHelper');
            await getFamilyInvitationUrl(familyInvitation1);

            await expect(gateway.setRedisCollectionData).toHaveBeenCalledTimes(1);
        });
        test('then a unique url should be generated with generateBranchIoUrl', async () => {
            const mockDisableBranchIo = false;
            mockOhanaShared(mockDisableBranchIo);
            const {getFamilyInvitationUrl} = require('./FamilyInvitationHelper');
            const response = await getFamilyInvitationUrl(familyInvitation1);

            await expect(genMockUrl.generateMockUrl).toHaveBeenCalledTimes(0);
            await expect(genBranchUrl.generateBranchIoUrl).toHaveBeenCalledTimes(1);
            await expect(response).toEqual(
                'http://vf.hrdev.io?invite=branch-82b4a340-7856-4cb4-ad23-7486626b63c7'
            );
        });
    });
});
