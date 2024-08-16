let ohanaSharedPackage = null,
    request = {},
    getRequest = {},
    response = {},
    resolver;
const {
    CONSTANTS: {HEALTH_CHECK_SUCCESS_CODE, HEALTH_CHECK_FAILURE_CODE}
} = require('ohana-shared');

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getMigrationVersion: jest.fn(() => Promise.resolve()),
        getKeyspaceInfo: jest.fn(() => Promise.resolve()),
        getManifestVersion: jest.fn(() => Promise.resolve()),
        createRedisPool: jest.fn(() => Promise.resolve()),
        createDatabasePool: jest.fn(() => Promise.resolve()),
        createRabbitMQPool: jest.fn(() => Promise.resolve()),
        createHttpPool: jest.fn(() => Promise.resolve()),
        getAllPoolStats: jest.fn(() => {})
    }));

    jest.mock('./AzureServiceBusAssertionCommand', () => jest.fn(() => Promise.resolve()));
    jest.mock('./BranchIoAssertionCommand', () => jest.fn(() => Promise.resolve()));
    jest.mock('./AzureStorageAssertionCommand', () => jest.fn(() => Promise.resolve()));
    jest.mock('./RabbitmqAmqpAssertionCommand', () => jest.fn(() => Promise.resolve()));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./HealthCheckFunction').healthCheck;

    request = {
        method: 'HEAD'
    };

    getRequest = {
        method: 'GET'
    };

    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('./AzureServiceBusAssertionCommand');
    jest.unmock('./BranchIoAssertionCommand');
    jest.unmock('./AzureStorageAssertionCommand');
});

describe(`Given we query the server to check its status`, () => {
    describe('when request method is HEAD', () => {
        describe('when CSA integration flag is disabled', () => {
            test(`then it should return status code ${HEALTH_CHECK_SUCCESS_CODE} if all services are up`, async () => {
                await resolver(request, response);
                expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_SUCCESS_CODE);
                expect(response.send).toHaveBeenCalledTimes(1);
            });
        });

        describe('when CSA integration flag is enabled', () => {
            test(`then it should return status code ${HEALTH_CHECK_SUCCESS_CODE} if all services are up`, async () => {
                ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = false;
                await resolver(request, response);
                expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_SUCCESS_CODE);
                expect(response.send).toHaveBeenCalledTimes(1);
            });
        });


        test(`then it should return status code ${HEALTH_CHECK_FAILURE_CODE} if at least one service is down`, async () => {
            ohanaSharedPackage.getMigrationVersion.mockImplementationOnce(() => Promise.reject());
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_FAILURE_CODE);
            expect(response.send).toHaveBeenCalledTimes(1);
        });
    });

    describe('when request method is GET', () => {
        describe('when CSA integration flag is disabled', () => {
            test(`then it should return status code ${HEALTH_CHECK_SUCCESS_CODE} if all services are up`, async () => {
                await resolver(getRequest, response);
                expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_SUCCESS_CODE);
                expect(response.send).toHaveBeenCalledTimes(1);
            });
        });

        describe('when CSA integration flag is enabled', () => {
            test(`then it should return status code ${HEALTH_CHECK_SUCCESS_CODE} if all services are up`, async () => {
                ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = false;
                await resolver(getRequest, response);
                expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_SUCCESS_CODE);
                expect(response.send).toHaveBeenCalledTimes(1);
            });
        });


        test(`then it should return status code ${HEALTH_CHECK_FAILURE_CODE} if at least one service is down`, async () => {
            ohanaSharedPackage.getMigrationVersion.mockImplementationOnce(() => Promise.reject());
            await resolver(getRequest, response);

            expect(response.code).toHaveBeenCalledWith(HEALTH_CHECK_FAILURE_CODE);
            expect(response.send).toHaveBeenCalledTimes(1);
        });
    });
});
