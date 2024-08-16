const {
    fixtureData: {tenant1}
} = require('../test/fixtures/DhpFixtures');

let makeCsaHttpRequest = null,
    httpPoolFactory = null,
    envHelper = null,
    fetch = null;
const userId = 'test',
    registerTenantOperation = 'registerTenant';

beforeEach(() => {
    jest.mock('../HttpPoolFactory', () => {
        return {
            getHttpPool: jest.fn(() => ({
                acquire: () => jest.fn(() => Promise.resolve('test-pool')),
                release: () => jest.fn()
            }))
        };
    });

    jest.mock('../tenant/TenantCsaCredentialDao', () => ({
        loadTenantCredentials: jest.fn(() => ({
            http: jest.fn()
        }))
    }));

    jest.mock('../EnvironmentHelper', () => ({
        isLocal: jest.fn()
    }));

    jest.mock('../constants', () => ({
        DISABLE_CSA_MOCKING: false,
        DISABLE_CSA_INTEGRATION: false,
        CSA_MOCKING_URL: 'mockUrl',
        HTTP_CONNECTION_POOLS: jest.fn(() => ({
            CSA: jest.fn()
        }))
    }));

    jest.mock('node-fetch', () => jest.fn());

    makeCsaHttpRequest = require('./CsaHttpGateway').makeCsaHttpRequest;
    httpPoolFactory = require('../HttpPoolFactory');
    envHelper = require('../EnvironmentHelper');
    fetch = require('node-fetch');
});

afterAll(() => {
    jest.unmock('node-fetch');
    jest.unmock('../HttpPoolFactory');
    jest.unmock('../tenant/TenantCsaCredentialDao');
    jest.unmock('../EnvironmentHelper');
    jest.unmock('../constants');
});

describe('Given we want to make http requests to csa', () => {
    describe('When we make a request from local env', () => {
        beforeEach(() => {
            envHelper.isLocal.mockReturnValueOnce(true);
            fetch.mockResolvedValue('test');
        });

        test('then it calls the mock server with node-fetch', async () => {
            const result = await makeCsaHttpRequest(
                tenant1.shortCode,
                userId,
                registerTenantOperation,
                registerTenantOperation
            );
            expect(fetch).toHaveBeenCalled();
            expect(result).toEqual('test');
        });

        test('then it throws an error', async () => {
            fetch.mockReturnValueOnce(() => Promise.reject(new Error()));
            expect(
                await makeCsaHttpRequest(
                    tenant1.shortCode,
                    userId,
                    registerTenantOperation,
                    registerTenantOperation
                )
            ).rejects.toThrow();
        });
    });

    describe('when we query the CSA supergraph', () => {
        beforeEach(() => {
            envHelper.isLocal.mockReturnValueOnce(false);
        });

        test('then it uses the conenction pool for requests', async () => {
            const result = await makeCsaHttpRequest(
                tenant1.shortCode,
                userId,
                registerTenantOperation,
                registerTenantOperation
            );
            expect(result).toEqual('test-pool');
        });

        test('then it throws an error', async () => {
            httpPoolFactory.getHttpPool.mockReturnValueOnce(() => Promise.reject(new Error()));
            expect(
                makeCsaHttpRequest(
                    tenant1.shortCode,
                    userId,
                    registerTenantOperation,
                    registerTenantOperation
                )
            ).rejects.toThrow();
        });
    });
});
