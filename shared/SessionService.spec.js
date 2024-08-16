const {
    OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER, ADMINISTRATOR},
    LATEST_SESSIONS_HASH,
    SESSION_REDIS_COLLECTION_TTL_IN_SECS,
    REDIS_COLLECTIONS: {SESSION, USERS_HASH}
} = require('./constants');

let gateway = null,
    sessionId1 = '82b4a340-7856-4cb4-ad23-7486626b63c7',
    sessionId2 = '2862830d-c074-4d8f-9902-76ccb54a9cea';

beforeEach(() => {
    jest.mock('./RedisGateway', () => ({
        updateExpiration: jest.fn(() => Promise.resolve()),
        setRedisHashMap: jest.fn(() => Promise.resolve()),
        getRedisHashMap: jest.fn(() =>
            Promise.resolve(
                JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: ['2862830d-c074-4d8f-9902-76ccb54a9cea']
                })
            )
        ),
        getAllRedisHashes: jest.fn(() => Promise.resolve()),
        setRedisCollectionData: jest.fn(() => Promise.resolve()),
        deleteRedisHashMap: jest.fn(() => Promise.resolve()),
        delRedisCollectionData: jest.fn(() => Promise.resolve()),
        deleteUserData: jest.fn(() => Promise.resolve()),
        getRedisCollectionData: jest.fn(() =>
            Promise.resolve({
                tenantId: '123',
                role: 'ApprovedUser',
                userId: '1234',
                firstName: 'John',
                lastName: 'Doe',
                title: 'Caregiver',
                deviceId: '',
                appVersion: '1.1.0',
                osVersion: '',
                deviceModel: '',
                sessionInactivityTimeoutInSecs: '60',
                eulaAcceptTimestamp: null
            })
        )
    }));

    jest.mock('uuid', () => {
        return {
            v4: () => '82b4a340-7856-4cb4-ad23-7486626b63c7'
        };
    });

    gateway = require('./RedisGateway');

    jest.useFakeTimers().setSystemTime(new Date('2022-01-01').getTime());
});

afterEach(() => {
    jest.unmock('./RedisGateway');
    jest.unmock('uuid');

    jest.useRealTimers();
});

describe('Given we want to interact with a session', () => {
    describe('when fetching a session', () => {
        test('then session is returned', async () => {
            const {getSession} = require('./SessionService');

            expect(await getSession('1234')).toStrictEqual({
                tenantId: '123',
                role: 'ApprovedUser',
                userId: '1234',
                firstName: 'John',
                lastName: 'Doe',
                title: 'Caregiver',
                deviceId: '',
                appVersion: '1.1.0',
                osVersion: '',
                deviceModel: '',
                sessionInactivityTimeoutInSecs: '60',
                eulaAcceptTimestamp: null
            });
        });
    });

    describe('when creating a session', () => {
        describe('when no index lookup exists', () => {
            test('then the index entry is created', async () => {
                const {createSession} = require('./SessionService');

                gateway.getRedisHashMap.mockImplementationOnce(() => null);

                await createSession('1234', {});

                await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                await expect(gateway.setRedisHashMap).toHaveBeenCalledWith(
                    LATEST_SESSIONS_HASH,
                    '1234',
                    {
                        createdAt: 1640995200000,
                        role: undefined,
                        sessionIds: [sessionId1]
                    }
                );
            });

            test('then session is returned', async () => {
                const {createSession} = require('./SessionService');

                gateway.getRedisHashMap.mockImplementationOnce(() => null);

                const result = await createSession('1234', {});

                expect(result).toBe(sessionId1);
            });
        });

        describe('when index exists', () => {
            test('then the index entry is updated', async () => {
                const {createSession} = require('./SessionService');

                await createSession('1234', {});

                await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                await expect(gateway.setRedisHashMap).toHaveBeenCalledWith(
                    LATEST_SESSIONS_HASH,
                    '1234',
                    {
                        createdAt: 1640995200000,
                        role: undefined,
                        sessionIds: [sessionId2, sessionId1]
                    }
                );
            });

            test('then session is returned', async () => {
                const {createSession} = require('./SessionService');

                const result = await createSession('1234', {});

                expect(result).toBe(sessionId1);
            });
        });
    });

    describe('when updating a session', () => {
        describe('when role is a family member', () => {
            describe('when inactivity time still exists', () => {
                test('then the cache should be updated', async () => {
                    const {updateSession} = require('./SessionService');

                    await updateSession(FAMILY_MEMBER, sessionId1, 600, '1234');

                    await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                    await expect(gateway.updateExpiration).toHaveBeenCalledTimes(1);
                });

                describe('when a cache update fails', () => {
                    test('then an error should be thrown', async () => {
                        const {updateSession} = require('./SessionService');

                        gateway.updateExpiration.mockImplementationOnce(
                            () => () => new Promise((_resolve, reject) => reject('Error'))
                        );

                        try {
                            await updateSession(FAMILY_MEMBER, sessionId1, 600, '1234');
                        } catch (err) {
                            expect(err.message).toBe('Invalid session');
                        }
                    });
                });
            });

            describe('when inactivity time is empty', () => {
                test('then the cache should be updated', async () => {
                    const {updateSession} = require('./SessionService');

                    await updateSession(FAMILY_MEMBER, sessionId1, 0, '1234');

                    await expect(gateway.updateSession).resolves;
                    await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(0);
                    await expect(gateway.updateExpiration).toHaveBeenCalledTimes(0);
                });
            });
        });

        describe('when role is a caregiver', () => {
            describe('when inactivity time still exists', () => {
                test('then the cache should be updated', async () => {
                    const {updateSession} = require('./SessionService');

                    await updateSession(CAREGIVER, sessionId1, 600, '1234');

                    await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                    await expect(gateway.updateExpiration).toHaveBeenCalledTimes(1);
                });

                describe('when a cache update fails', () => {
                    test('then an error should be thrown', async () => {
                        const {updateSession} = require('./SessionService');

                        gateway.updateExpiration.mockImplementationOnce(
                            () => () => new Promise((_resolve, reject) => reject('Error'))
                        );

                        try {
                            await updateSession(CAREGIVER, sessionId1, 600, '1234');
                        } catch (err) {
                            expect(err.message).toBe('Invalid session');
                        }
                    });
                });
            });

            describe('when inactivity time is empty', () => {
                test('then the cache should be updated', async () => {
                    const {updateSession} = require('./SessionService');

                    await updateSession(CAREGIVER, sessionId1, 0, '1234');

                    await expect(gateway.updateSession).resolves;
                    await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(0);
                    await expect(gateway.updateExpiration).toHaveBeenCalledTimes(0);
                });
            });
        });

        describe('when role is an admin', () => {
            test('then the cache should be left unchanged', async () => {
                const {updateSession} = require('./SessionService');

                await updateSession(ADMINISTRATOR, sessionId1, 0, '1234');

                await expect(gateway.updateSession).resolves;
                await expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(0);
                await expect(gateway.updateExpiration).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('when updating a session eula acceptance status', () => {
        describe('when using a valid session id', () => {
            test('then it should update the "eulaAcceptTimestamp" property with the current date', async () => {
                const {updateSessionEula} = require('./SessionService');
                const currDate = new Date();

                await updateSessionEula(sessionId1, currDate);

                await expect(gateway.getRedisCollectionData).toHaveBeenCalledTimes(1);
                await expect(gateway.setRedisCollectionData).toHaveBeenCalledWith(
                    SESSION,
                    SESSION_REDIS_COLLECTION_TTL_IN_SECS,
                    sessionId1,
                    {
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: currDate
                    }
                );
            });
        });

        describe('when using an invalid session id', () => {
            test('then it should throw', async () => {
                const {updateSessionEula} = require('./SessionService');
                const currDate = new Date();

                gateway.getRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await updateSessionEula('123', currDate);
                } catch (err) {
                    expect(err.message).toBe('Invalid session');
                }
            });
        });

        describe('when a cache update fails', () => {
            test('then it should throw', async () => {
                const {updateSessionEula} = require('./SessionService');
                const currDate = new Date();

                gateway.setRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await updateSessionEula(sessionId1, currDate);
                } catch (err) {
                    expect(err.message).toBe('Invalid session');
                }
            });
        });
    });

    describe('when deleting a session by user ID', () => {
        describe('when the user has no sessions', () => {
            test('then nothing happens', async () => {
                const {deleteSessionByUserId} = require('./SessionService');

                gateway.getRedisHashMap.mockImplementationOnce(() => null);

                await deleteSessionByUserId('1234');

                expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(0);
            });
        });

        describe('when the user has sessions', () => {
            test('then each session is deleted', async () => {
                const {deleteSessionByUserId} = require('./SessionService');

                await deleteSessionByUserId('1234');

                expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(1);
                expect(gateway.deleteRedisHashMap).toHaveBeenCalledWith(LATEST_SESSIONS_HASH, [
                    '1234'
                ]);
            });
        });
    });

    describe('when deleting a session by ID', () => {
        describe('when the session does not exists', () => {
            test('then nothing happens', async () => {
                const {deleteSessionBySessionId} = require('./SessionService');

                gateway.getRedisCollectionData.mockImplementationOnce(() => null);

                await deleteSessionBySessionId(sessionId1);

                expect(gateway.delRedisCollectionData).toHaveBeenCalledTimes(0);
            });
        });

        describe('when the session exists', () => {
            test('then the session is deleted', async () => {
                const {deleteSessionBySessionId} = require('./SessionService');

                await deleteSessionBySessionId(sessionId1);

                expect(gateway.delRedisCollectionData).toHaveBeenCalledTimes(1);
                expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
            });

            describe('when the index is empty', () => {
                test('then nothing happens', async () => {
                    const {deleteSessionBySessionId} = require('./SessionService');

                    gateway.getRedisHashMap.mockImplementationOnce(() => {
                        return JSON.stringify({
                            createdAt: 1641460089124,
                            sessionIds: []
                        });
                    });

                    await deleteSessionBySessionId(sessionId1);

                    expect(gateway.delRedisCollectionData).toHaveBeenCalledTimes(1);
                    expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(1);
                });
            });

            describe('when the index exists', () => {
                describe('when the index has a single entry', () => {
                    test('then the index is cleared', async () => {
                        const {deleteSessionBySessionId} = require('./SessionService');

                        gateway.getRedisHashMap.mockImplementationOnce(() => {
                            return JSON.stringify({
                                createdAt: 1641460089124,
                                sessionIds: [sessionId1]
                            });
                        });

                        await deleteSessionBySessionId(sessionId1);

                        expect(gateway.delRedisCollectionData).toHaveBeenCalledTimes(1);
                        expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(1);
                    });
                });

                describe('when the index has multiple entries', () => {
                    test('then the index is updated', async () => {
                        const {deleteSessionBySessionId} = require('./SessionService');

                        gateway.getRedisHashMap.mockImplementationOnce(() => {
                            return JSON.stringify({
                                createdAt: 1641460089124,
                                sessionIds: [sessionId1, sessionId2]
                            });
                        });

                        await deleteSessionBySessionId(sessionId1);

                        expect(gateway.delRedisCollectionData).toHaveBeenCalledTimes(1);
                        expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(0);
                        expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                    });
                });
            });
        });
    });

    describe('when refreshing session index', () => {
        describe('when the index is out-of-date', () => {
            describe('when a user entry has at least one session remaining', () => {
                test('then the index entry remains', async () => {
                    const {refreshSessionIndex} = require('./SessionService');

                    gateway.getAllRedisHashes.mockImplementationOnce(() =>
                        Promise.resolve([
                            JSON.stringify({
                                createdAt: 1641460089124,
                                sessionIds: [sessionId1]
                            })
                        ])
                    );

                    await refreshSessionIndex();

                    expect(gateway.setRedisHashMap).toHaveBeenCalledTimes(1);
                    expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(0);
                });
            });

            describe('when a user entry has at no sessions remaining', () => {
                test('then the index entry is removed', async () => {
                    const {refreshSessionIndex} = require('./SessionService');

                    gateway.getAllRedisHashes.mockImplementationOnce(() =>
                        Promise.resolve([
                            JSON.stringify({
                                createdAt: 1641460089124,
                                sessionIds: [sessionId1]
                            })
                        ])
                    );
                    gateway.getRedisCollectionData.mockImplementationOnce(() => null);

                    await refreshSessionIndex();

                    expect(gateway.deleteRedisHashMap).toHaveBeenCalledTimes(1);
                });
            });
        });
    });

    describe('When batch deleting user related session data', () => {
        test('then it does nothing if no user ids are provided', async () => {
            const {deleteSessionsByUserIds} = require('./SessionService');

            await expect(deleteSessionsByUserIds(null)).resolves.not.toThrow();
        });

        test('then it does nothing if no sessions are found in the hash', async () => {
            const {deleteSessionsByUserIds} = require('./SessionService');

            gateway.getAllRedisHashes.mockImplementationOnce(() => Promise.resolve(null));
            await expect(deleteSessionsByUserIds(['dummy-user'])).resolves.not.toThrow();
        });

        test('then it deletes user data from redis', async () => {
            const {deleteSessionsByUserIds} = require('./SessionService');

            gateway.getAllRedisHashes.mockImplementationOnce(() =>
                Promise.resolve({
                    1: JSON.stringify({
                        createdAt: 1641460089124,
                        sessionIds: [sessionId1]
                    })
                })
            );
            await deleteSessionsByUserIds(['1']);
            expect(gateway.deleteRedisHashMap).toHaveBeenCalledWith(LATEST_SESSIONS_HASH, ['1']);
            expect(gateway.delRedisCollectionData).toHaveBeenCalledWith(USERS_HASH, '1');
            expect(gateway.delRedisCollectionData).toHaveBeenCalledWith(SESSION, sessionId1);
        });
    });

    describe('when inserting a patient ids into the session mapped patients list', () => {
        describe('when using a valid session id', () => {
            test('then it should update the "mappedPatients" property with the additional patient id to the array', async () => {
                const {insertSessionMappedPatientByIds} = require('./SessionService');
                const newPatientId = [2345];
                await insertSessionMappedPatientByIds(newPatientId, '1234');

                await expect(gateway.getRedisCollectionData).toHaveBeenCalledTimes(1);
                await expect(gateway.setRedisCollectionData).toHaveBeenCalledWith(
                    SESSION,
                    SESSION_REDIS_COLLECTION_TTL_IN_SECS,
                    sessionId2,
                    {
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: null,
                        mappedPatients: newPatientId
                    }
                );
            });
        });

        describe('when using an invalid session id', () => {
            test('then it should throw', async () => {
                const {insertSessionMappedPatientByIds} = require('./SessionService');
                const newPatientId = [2346];

                gateway.getRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await insertSessionMappedPatientByIds(newPatientId, '123');
                } catch (err) {
                    expect(err.message).toBe('Error on adding patient to session');
                }
            });
        });

        describe('when a cache update fails', () => {
            test('then it should throw', async () => {
                const {insertSessionMappedPatientByIds} = require('./SessionService');
                const newPatientId = [2347];

                gateway.setRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await insertSessionMappedPatientByIds(newPatientId, '1234');
                } catch (err) {
                    expect(err.message).toBe('Error on adding patient to session');
                }
            });
        });
    });
    describe('when removing a patient id from the session mapped patients list', () => {
        describe('when using a valid session id', () => {
            test('then it should update the "mappedPatients" property by removing the patient id from the array', async () => {
                const {removeSessionMappedPatientById} = require('./SessionService');
                const patientIds = [2, 3, 4];

                gateway.getRedisCollectionData.mockImplementation(() => {
                    return Promise.resolve({
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: null,
                        mappedPatients: patientIds
                    });
                });

                await removeSessionMappedPatientById(patientIds[0], '1234');
                patientIds.shift();

                await expect(gateway.getRedisCollectionData).toHaveBeenCalledTimes(1);
                await expect(gateway.setRedisCollectionData).toHaveBeenCalledWith(
                    SESSION,
                    SESSION_REDIS_COLLECTION_TTL_IN_SECS,
                    sessionId2,
                    {
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: null,
                        mappedPatients: patientIds
                    }
                );
            });
        });

        describe('when using an invalid session id', () => {
            test('then it should throw', async () => {
                const {removeSessionMappedPatientById} = require('./SessionService');
                const patientIds = ['2', '3', '4'];

                gateway.getRedisCollectionData.mockImplementation(() => {
                    return Promise.resolve({
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: null,
                        mappedPatients: patientIds
                    });
                });
                patientIds.shift();

                gateway.getRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await removeSessionMappedPatientById(patientIds[0], '123');
                } catch (err) {
                    expect(err.message).toBe('Error on removing patient from session');
                }
            });
        });

        describe('when a cache update fails', () => {
            test('then it should throw', async () => {
                const {removeSessionMappedPatientById} = require('./SessionService');
                const patientIds = ['2', '3', '4'];

                gateway.getRedisCollectionData.mockImplementation(() => {
                    return Promise.resolve({
                        tenantId: '123',
                        role: 'ApprovedUser',
                        userId: '1234',
                        firstName: 'John',
                        lastName: 'Doe',
                        title: 'Caregiver',
                        deviceId: '',
                        appVersion: '1.1.0',
                        osVersion: '',
                        deviceModel: '',
                        sessionInactivityTimeoutInSecs: '60',
                        eulaAcceptTimestamp: null,
                        mappedPatients: patientIds
                    });
                });
                patientIds.shift();

                gateway.setRedisCollectionData.mockImplementationOnce(
                    () => () => new Promise((_resolve, reject) => reject('Error'))
                );

                try {
                    await removeSessionMappedPatientById(patientIds[0], '1234');
                } catch (err) {
                    expect(err.message).toBe('Error on removing patient from session');
                }
            });
        });
    });

    describe('When batch removing a patient id from a users session mapped patients list', () => {
        test('then it does nothing if no user ids are provided', async () => {
            const {removeSessionMappedPatientForAllUsers} = require('./SessionService');
            const patientId = 2345;

            await expect(
                removeSessionMappedPatientForAllUsers(patientId, null)
            ).resolves.not.toThrow();
        });

        test('then it removes the patient id from a users session mapped patients list', async () => {
            const {removeSessionMappedPatientForAllUsers} = require('./SessionService');
            const patientId = 2345;
            const userIds = ['1234', '5678'];
            gateway.getRedisCollectionData.mockImplementation(() => {
                return Promise.resolve({
                    tenantId: '123',
                    role: 'ApprovedUser',
                    userId: userIds[0],
                    firstName: 'John',
                    lastName: 'Doe',
                    title: 'Caregiver',
                    deviceId: '',
                    appVersion: '1.1.0',
                    osVersion: '',
                    deviceModel: '',
                    sessionInactivityTimeoutInSecs: '60',
                    eulaAcceptTimestamp: null,
                    mappedPatients: patientId
                });
            });
            gateway.getRedisCollectionData.mockImplementation(() => {
                return Promise.resolve({
                    tenantId: '123',
                    role: 'ApprovedUser',
                    userId: userIds[1],
                    firstName: 'Sam',
                    lastName: 'Penny',
                    title: 'Caregiver',
                    deviceId: '',
                    appVersion: '1.1.0',
                    osVersion: '',
                    deviceModel: '',
                    sessionInactivityTimeoutInSecs: '60',
                    eulaAcceptTimestamp: null,
                    mappedPatients: patientId
                });
            });

            await removeSessionMappedPatientForAllUsers(patientId, userIds);

            await expect(gateway.getRedisCollectionData).toHaveBeenCalledTimes(2);
        });
    });

    describe('When updating user chat unread counts', () => {
        test('Then we should increment the count', async () => {
            const {updateChatCountForPatient} = require('./SessionService');

            gateway.getRedisHashMap.mockImplementationOnce(() => {
                return JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: [sessionId1, sessionId2],
                    chatCounts: {1: 1}
                });
            });

            const result = await updateChatCountForPatient(['1234'], 1);
            expect(result['1234']).toEqual(2);
        });

        test('Then we should decrement the count', async () => {
            const {updateChatCountForPatient} = require('./SessionService');

            gateway.getRedisHashMap.mockImplementationOnce(() => {
                return JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: [sessionId1, sessionId2],
                    chatCounts: {1: 1}
                });
            });

            const result = await updateChatCountForPatient(['1234'], 1, false);
            expect(result['1234']).toEqual(0);
        });
    });

    describe('When setting the chat count', () => {
        test('then we should set it in the redis hash', async () => {
            const {setChatCountForPatientId} = require('./SessionService');

            await setChatCountForPatientId('1234', '1', 1);
            const json = {
                chatCounts: {
                    1: 1
                },
                createdAt: 1641460089124,
                sessionIds: ['2862830d-c074-4d8f-9902-76ccb54a9cea']
            };
            expect(gateway.setRedisHashMap).toHaveBeenCalledWith(
                LATEST_SESSIONS_HASH,
                '1234',
                json
            );
        });
    });

    describe('When getting the chat count', () => {
        test('then we should get it from the redis hash', async () => {
            const {getChatCountForPatientId} = require('./SessionService');

            gateway.getRedisHashMap.mockImplementationOnce(() => {
                return JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: [sessionId1, sessionId2],
                    chatCounts: {1: 1}
                });
            });

            const result = await getChatCountForPatientId('1234', '1');
            expect(result).toEqual(1);
        });
    });

    describe('When setting the subscription id', () => {
        test('then it should set it in the redis hash', async () => {
            const {setChatReadReceiptsSubscriptionId} = require('./SessionService');

            await setChatReadReceiptsSubscriptionId('1234', '1');
            const json = {
                createdAt: 1641460089124,
                sessionIds: ['2862830d-c074-4d8f-9902-76ccb54a9cea'],
                subscriptionId: '1'
            };
            expect(gateway.setRedisHashMap).toHaveBeenCalledWith(
                LATEST_SESSIONS_HASH,
                '1234',
                json
            );
        });
    });

    describe('When getting the chat count for a patient id', () => {
        test('then we should get it from the redis hash', async () => {
            const {getChatCountForPatientId} = require('./SessionService');

            gateway.getRedisHashMap.mockImplementationOnce(() => {
                return JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: [sessionId1, sessionId2],
                    chatCounts: {1: 1}
                });
            });

            const result = await getChatCountForPatientId('1234', '1');
            expect(result).toEqual(1);
        });
    });

    describe('When getting the chat count', () => {
        test('then we should get it from the redis hash', async () => {
            const {getChatReadReceiptsSubscriptionId} = require('./SessionService');

            gateway.getRedisHashMap.mockImplementationOnce(() => {
                return JSON.stringify({
                    createdAt: 1641460089124,
                    sessionIds: [sessionId1, sessionId2],
                    chatCounts: {1: 1},
                    subscriptionId: '01HKA8YK4KBFBXBXZH1GXBKQNG'
                });
            });

            const result = await getChatReadReceiptsSubscriptionId('1234');
            expect(result).toEqual('01HKA8YK4KBFBXBXZH1GXBKQNG');
        });
    });
});
