let csaBootstrapMockServer,
    csaTearDown,
    csaTearDownMockServer,
    resetCsaSetUp,
    csaTenantRegistration;

beforeEach(async () => {
    // TenantCsaRmqConfigurationDao needs to be mocked to produce rmq responses, for example returning federated tenants.
    jest.mock('../tenant/TenantCsaRmqConfigurationDao', () => {
        return {
            listAllFederatedTenants: jest.fn(() => []),
            createFederatedTenantResources: jest.fn(() => Promise.resolve())
        };
    });

    csaBootstrapMockServer = require('../test/CsaIntegrationHelper').csaBootstrapMockServer;
    csaTearDown = require('../test/CsaIntegrationHelper').csaTearDown;
    csaTearDownMockServer = require('../test/CsaIntegrationHelper').csaTearDownMockServer;
    resetCsaSetUp = require('../test/CsaIntegrationHelper').resetCsaSetUp;
    csaTenantRegistration = require('./TenantCsaDao').csaTenantRegistration;

    jest.mock('../logs/LoggingService', () => {
        return {
            getLogger: jest.fn(() => {
                return {
                    debug: jest.fn(),
                    info: jest.fn(),
                    error: jest.fn()
                };
            })
        };
    });
});

afterEach(async () => {
    await resetCsaSetUp();
    await csaTearDownMockServer();
});

afterAll(async () => {
    await csaTearDown();
});

describe('Given we want to work with the CSA and our tenant information', () => {
    describe('when we want to register a tenant', () => {
        const userId = '1234-abc',
            tenantId = '00JL',
            csaMockedUrl = new URL('http://localhost:4007/'),
            expected = {data: {registerTenant: true}};

        describe('when we provide credentials', () => {
            it('then we should see registerTenant return with a value of true', async () => {
                await csaBootstrapMockServer(csaMockedUrl, {}, {}, () => {
                    return {
                        registerTenant: (_, {input}) => {
                            if (input?.credentials) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                });

                const results = await csaTenantRegistration(tenantId, userId);

                expect(results).toMatchObject(expected);
                expect(results.data.registerTenant).toBeTruthy();
            });
        });

        describe('when we encounter an unexpected error', () => {
            it('then true should be returned because the csa is available for the tenant', async () => {
                await csaBootstrapMockServer(csaMockedUrl, {}, {}, () => {
                    return {
                        registerTenant: () => {
                            return false;
                        }
                    };
                });

                await csaTenantRegistration(tenantId, userId)
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((error) => {
                        expect(error).not.toBeNull();
                    });
            });
        });
    });
});
