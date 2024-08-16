let resolver = null,
    ohanaSharedPackage = null;

const mockOhanaShared = (mockDisableCsaIntegration) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(),
        fetchAdminIdentity: jest.fn(() => {
            return {
                firstName: 'Vlad',
                lastName: 'Doe',
                userId: 'ee96bede-e658-4fbe-b483-4f8748242914',
                role: 'Administrator',
                title: 'SoftVision'
            };
        }),
        upsertAdminUser: jest.fn(() => true),
        insertDefaultTenantSettings: jest.fn(() => true),
        writeLog: jest.fn(),
        fetchTenantShortCode: jest.fn(),
        csaTenantRegistration: jest.fn(),
        createAdminSession: jest.fn(() => 'i23u3t202232'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared').CONSTANTS,
            DISABLE_CSA_INTEGRATION: mockDisableCsaIntegration
        }
    }));

    ohanaSharedPackage = require('ohana-shared');
};

beforeEach(() => {
    jest.mock('uuid', () => ({
        v4: jest.fn(() => 'i23u3t202232')
    }));
});

afterEach(() => {
    jest.unmock('./AdminCreateOrRefreshSessionResolver');
    jest.unmock('ohana-shared');
    jest.unmock('uuid');
});

const tenantShortCode = '0000';

describe('Given we want to resolve a GQL mutation to create or refresh a session', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            mockOhanaShared(false);
            resolver = require('./AdminCreateOrRefreshSessionResolver');

            const result = await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: 'f4dcdb22-a4c7-4f4c-a390-1954365b828c'
                },
                {version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION}
            );

            expect(result.user).toEqual(
                expect.objectContaining({
                    title: 'SoftVision',
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    id: 'ee96bede-e658-4fbe-b483-4f8748242914',
                    tenant: {id: 'f4dcdb22-a4c7-4f4c-a390-1954365b828c'},
                    role: 'Administrator'
                })
            );
            expect(result.id).toBe('i23u3t202232');
        });
    });

    describe('when no admin identity can be retrieved', () => {
        test('then it should return null', async () => {
            mockOhanaShared(false);
            resolver = require('./AdminCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');
            ohanaSharedPackage.fetchAdminIdentity.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: 'f4dcdb22-a4c7-4f4c-a390-1954365b828c'
                },
                {version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });

    describe('when the CSA integration is enabled', () => {
        test('then it should call the 2 functions with appropriate inputs', async () => {
            mockOhanaShared(false);
            resolver = require('./AdminCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');
            ohanaSharedPackage.fetchTenantShortCode.mockResolvedValue(tenantShortCode);

            await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: 'f4dcdb22-a4c7-4f4c-a390-1954365b828c'
                },
                {version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION}
            );
            expect(ohanaSharedPackage.fetchTenantShortCode).toHaveBeenCalledWith(
                'nwufwnv.hu8fuf.3u8fu',
                'f4dcdb22-a4c7-4f4c-a390-1954365b828c'
            );
            expect(ohanaSharedPackage.csaTenantRegistration).toHaveBeenCalledWith(
                tenantShortCode,
                'ee96bede-e658-4fbe-b483-4f8748242914'
            );
        });
    });

    describe('when the CSA integration is disabled', () => {
        test('then it should not call the functions if the CSA integration is disabled', async () => {
            mockOhanaShared(true);
            resolver = require('./AdminCreateOrRefreshSessionResolver');
            ohanaSharedPackage = require('ohana-shared');

            await resolver(
                null,
                {
                    bearerToken: 'nwufwnv.hu8fuf.3u8fu',
                    tenantId: 'f4dcdb22-a4c7-4f4c-a390-1954365b828c'
                },
                {version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION}
            );
            expect(ohanaSharedPackage.fetchTenantShortCode).not.toHaveBeenCalled();
            expect(ohanaSharedPackage.csaTenantRegistration).not.toHaveBeenCalled();
        });
    });
});
