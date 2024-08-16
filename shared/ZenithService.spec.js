const {
        fixtureData: {user7, user8}
    } = require('./test/fixtures/UsersFixtures'),
    {mockFetch} = require('./test/MockModulesHelper'),
    {
        fixtureData: {identifierList1}
    } = require('./test/fixtures/DhpFixtures'),
    {EXTERNAL_ID_TYPE_VISIT_NUMBER} = require('./constants');

const mockDhpGateway = (mockData, mockOk, mockStatus, mockText) => {
    jest.mock('./DhpHttpGateway', () => ({
        makeDhpApiCall: jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockData),
                ok: mockOk,
                status: mockStatus,
                text: () => Promise.resolve(mockText)
            })
        )
    }));
    jest.mock('./RedisGateway');
};

jest.mock('jwk-to-pem', () => () => 'test pem');

const mockJwtVerify = (mockDecodedJWT) => {
    jest.mock('jsonwebtoken', () => ({
        ...jest.requireActual('jsonwebtoken'),
        verify: () => {},
        decode: () => mockDecodedJWT
    }));
};

afterEach(() => {
    jest.unmock('./DhpHttpGateway');
    jest.unmock('./RedisGateway');
    jest.unmock('node-fetch');
    jest.unmock('jsonwebtoken');
});

const mockPatientResource = {
    id: '123-456-789',
    name: [
        {
            given: ['John'],
            family: 'Doe'
        }
    ],
    birthDate: '2000-01-29'
};

describe('Given we want to use the Zenith service to fetch user data', () => {
    describe('when we want to get an administrator`s data', () => {
        test('then it should return the data if the request is successful', async () => {
            mockFetch(
                {
                    keys: [{kid: 'TESTKID'}]
                },
                true,
                200
            );
            mockJwtVerify({
                hillrom: '{"scopes": {"roles": ["Ohana Administrator"]}, "jobTitle": "IT Admin"}',
                sourceUser: '4dd0a63c-ef3e-47a0-899b-87d3c7b6cb68',
                given_name: 'Debbie',
                family_name: 'Rose 0'
            });

            const {fetchAdminIdentity} = require('./ZenithService');
            expect(user7).toMatchObject(await fetchAdminIdentity(user7.jwt));
        });
        test(`then it should throw if the JWT header's 'kid' does not correspond with the public key`, async () => {
            mockFetch(
                {
                    keys: [{kid: 'INVALIDKID'}]
                },
                true,
                200
            );

            const {fetchAdminIdentity} = require('./ZenithService');
            await expect(fetchAdminIdentity(user7.jwt)).rejects.toThrow('Invalid JWT');
        });
        test(`then it should throw if the JWT does not match the key's 'pem'`, async () => {
            mockFetch(
                {
                    keys: [{kid: 'TESTKID'}]
                },
                true,
                200
            );

            const {fetchAdminIdentity} = require('./ZenithService');
            await expect(fetchAdminIdentity(user7.jwt)).rejects.toThrow('Invalid JWT');
        });
        test(`then it should throw if the JWT role is not of an administrator`, async () => {
            mockFetch(
                {
                    keys: [{kid: 'TESTKID'}]
                },
                true,
                200
            );
            mockJwtVerify({
                hillrom: '{"scopes": {"roles": ["Ohana Client"]}, "jobTitle": "IT Admin"}',
                sourceUser: '4dd0a63c-ef3e-47a0-899b-87d3c7b6cb68',
                given_name: 'Debbie',
                family_name: 'Rose 0'
            });

            const {fetchAdminIdentity} = require('./ZenithService');
            await expect(fetchAdminIdentity(user8.jwt)).rejects.toThrow('Forbidden');
        });
    });
    describe(`when we want to get a caregiver's data`, () => {
        test('then it should return the data if the request is successful', async () => {
            mockDhpGateway({}, true, 200, 'e9567f5d-b066-4d92-8fa3-57786df24e1b');

            const {fetchCaregiverTenantIdentifier} = require('./ZenithService');
            expect(user8).toMatchObject(await fetchCaregiverTenantIdentifier(user8.jwt, 'T0000'));
        });
        test(`then it should throw if the given tenant and JWT's role are both invalid`, async () => {
            mockDhpGateway({}, false, 403);
            mockJwtVerify({
                hillrom: '{"scopes": {"roles": ["Ohana Test"]}, "jobTitle": "IT Admin"}',
                sourceUser: '4dd0a63c-ef3e-47a0-899b-87d3c7b6cb68',
                given_name: 'Debbie',
                family_name: 'Rose 0'
            });

            const {fetchCaregiverTenantIdentifier} = require('./ZenithService');
            await expect(fetchCaregiverTenantIdentifier(user7.jwt, 'T0000')).rejects.toThrow(
                'tenantRoleError'
            );
        });
        test(`then it should throw if the given tenant is invalid`, async () => {
            mockDhpGateway({}, false, 400);

            const {fetchCaregiverTenantIdentifier} = require('./ZenithService');
            await expect(fetchCaregiverTenantIdentifier(user8.jwt, 'T0000')).rejects.toThrow(
                'tenantError'
            );
        });
        test(`then it should throw if the given JWT's role is invalid`, async () => {
            mockDhpGateway({}, true, 200, 'e9567f5d-b066-4d92-8fa3-57786df24e1b');

            const {fetchCaregiverTenantIdentifier} = require('./ZenithService');
            await expect(fetchCaregiverTenantIdentifier(user7.jwt, 'T0000')).rejects.toThrow(
                'Forbidden'
            );
        });
    });
    describe(`when we want to get a patient's data`, () => {
        describe(`if the patient external id type is ${EXTERNAL_ID_TYPE_VISIT_NUMBER}`, () => {
            test(`then it should return the data if the request is successful`, async () => {
                mockDhpGateway(
                    {
                        entry: [
                            {
                                resource: mockPatientResource
                            }
                        ],
                        subject: {
                            reference: 'testReference'
                        }
                    },
                    true,
                    200
                );

                const {fetchPatientInformationFromZenithAPI} = require('./ZenithService');
                expect(
                    await fetchPatientInformationFromZenithAPI('12345', '54321', '11', '')
                ).toStrictEqual({
                    cdrId: mockPatientResource.id,
                    firstName: mockPatientResource.name[0].given[0],
                    lastName: mockPatientResource.name[0].family,
                    dateOfBirth: mockPatientResource.birthDate
                });
            });
        });
        describe(`if the patient external id type is ${EXTERNAL_ID_TYPE_VISIT_NUMBER}`, () => {
            test(`then it should return the data if the request is successful`, async () => {
                mockDhpGateway(
                    {
                        entry: [
                            {
                                resource: mockPatientResource
                            }
                        ],
                        ...mockPatientResource,
                        subject: {
                            reference: 'testReference'
                        }
                    },
                    true,
                    200
                );

                const {fetchPatientInformationFromZenithAPI} = require('./ZenithService');
                expect(
                    await fetchPatientInformationFromZenithAPI(
                        '12345',
                        '54321',
                        '11',
                        EXTERNAL_ID_TYPE_VISIT_NUMBER
                    )
                ).toStrictEqual({
                    cdrId: mockPatientResource.id,
                    firstName: mockPatientResource.name[0].given[0],
                    lastName: mockPatientResource.name[0].family,
                    dateOfBirth: mockPatientResource.birthDate
                });
            });
        });
        test(`then it should return null if fetching the encounter or patient fails`, async () => {
            mockDhpGateway({}, false, 404);

            const {fetchPatientInformationFromZenithAPI} = require('./ZenithService');
            expect(await fetchPatientInformationFromZenithAPI('12345', '54321', '11', '')).toBe(
                null
            );
        });
        test(`then it should throw if no Bearer 'token' is provided`, async () => {
            const {fetchPatientInformationFromZenithAPI} = require('./ZenithService');
            await expect(
                fetchPatientInformationFromZenithAPI('', '54321', '11', '')
            ).rejects.toThrow('Invalid Token');
        });
        test(`then it should throw if no 'tenantId' or 'patientExternalId' is provided`, async () => {
            const {fetchPatientInformationFromZenithAPI} = require('./ZenithService');
            await expect(fetchPatientInformationFromZenithAPI('12345', '', '', '')).rejects.toThrow(
                'tenantError'
            );
        });
    });

    describe('when we want to retrieve the tenant short code', () => {
        test('then it returns for valid tenant long code', () => {
            mockDhpGateway(identifierList1, true, 200);
            const {fetchTenantShortCode} = require('./ZenithService');
            expect(fetchTenantShortCode('token', 'tenantId')).resolves.toEqual(
                identifierList1[0].identifierValue
            );
        });

        test('then it returns undefined for invalid code', () => {
            mockDhpGateway(null, false, 500);
            const {fetchTenantShortCode} = require('./ZenithService');
            expect(fetchTenantShortCode('token', 'tenantId')).resolves.toBeUndefined();
        });
    });
});
