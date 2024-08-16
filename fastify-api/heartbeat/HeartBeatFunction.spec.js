let ohanaSharedPackage = null,
    request = {},
    response = {},
    resolver;
const {
    CONSTANTS: {
        CAREGIVER_EULA_LAST_CHANGED_DATE,
        FAMILY_MEMBER_EULA_LAST_CHANGED_DATE,
        OHANA_ROLES: {ADMINISTRATOR, FAMILY_MEMBER, CAREGIVER}
    }
} = require('ohana-shared');
beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(() => Promise.resolve())
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./HeartBeatFunction').heartBeat;

    request = {
        headers: {
            authorization: 'Bearer X7ATmtGdTQ'
        }
    };
    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we send a request to the heartbeat endpoint', () => {
    describe('if the authentication bearer token is not set', () => {
        test('then it should return response code 204', async () => {
            request.headers = {};
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(204);
            expect(response.send).toHaveBeenCalledTimes(1);
        });
    });

    describe('if the authentication bearer token is set', () => {
        test('then it should return response code 403 if a bearer token is invalid', async () => {
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledTimes(1);
        });

        test('then it should return response code 204 if the user is an administrator', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                return {role: ADMINISTRATOR};
            });
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(204);
            expect(response.send).toHaveBeenCalledTimes(1);
        });

        describe(`if the authenticated users role is ${FAMILY_MEMBER}`, () => {
            test('then it should return status code 204 if the user has accepted the FM Eula', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({
                        role: FAMILY_MEMBER,
                        eulaAcceptTimestamp: FAMILY_MEMBER_EULA_LAST_CHANGED_DATE
                    })
                );
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(204);
                expect(response.send).toHaveBeenCalledTimes(1);
            });

            test('then it should return status code 451 if the user has not accepted the FM Eula', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({
                        role: FAMILY_MEMBER,
                        eulaAcceptTimestamp: new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE) - 1
                    })
                );
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({role: CAREGIVER, eulaAcceptTimestamp: null})
                );
                await resolver(request, response);
                await resolver(request, response);

                expect(response.code).toHaveBeenNthCalledWith(1, 451);
                expect(response.code).toHaveBeenNthCalledWith(2, 451);
                expect(response.send).toHaveBeenCalledTimes(2);
            });
        });

        describe(`if the authenticated users role is ${CAREGIVER}`, () => {
            test('then it should return status code 204 if the user has accepted the CG Eula', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({
                        role: CAREGIVER,
                        eulaAcceptTimestamp: CAREGIVER_EULA_LAST_CHANGED_DATE
                    })
                );
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(204);
                expect(response.send).toHaveBeenCalledTimes(1);
            });

            test('then it should return status code 451 if the user has not accepted the CG Eula', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({
                        role: CAREGIVER,
                        eulaAcceptTimestamp: new Date(CAREGIVER_EULA_LAST_CHANGED_DATE) - 1
                    })
                );
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() =>
                    Promise.resolve({role: CAREGIVER, eulaAcceptTimestamp: null})
                );
                await resolver(request, response);
                await resolver(request, response);

                expect(response.code).toHaveBeenNthCalledWith(1, 451);
                expect(response.code).toHaveBeenNthCalledWith(2, 451);
                expect(response.send).toHaveBeenCalledTimes(2);
            });
        });
    });
});
