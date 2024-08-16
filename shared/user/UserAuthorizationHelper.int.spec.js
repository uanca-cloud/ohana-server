let sessionService = null,
    patientDao = null,
    isUserMappedToPatient = null,
    rehydrateUserMappedPatients = null,
    redisClient = null,
    teardownPool = null,
    createPool = null,
    getClient = null,
    teardownClient = null;

beforeEach(async () => {
    jest.mock('../SessionService', () => ({
        insertSessionMappedPatientByIds: jest.fn()
    }));

    jest.mock('../patient/PatientDao', () => ({
        getAllPatientsIdsByUser: jest.fn(() => [1, 2, 3])
    }));

    sessionService = require('../SessionService');
    patientDao = require('../patient/PatientDao');
    createPool = require('../test/RedisTestHelper').createTestPool;
    teardownPool = require('../test/RedisTestHelper').teardownTestPool;
    getClient = require('../test/RedisTestHelper').getTestClient;
    teardownClient = require('../test/RedisTestHelper').teardownTestClient;
    isUserMappedToPatient = require('./UserAuthorizationHelper').isUserMappedToPatient;
    rehydrateUserMappedPatients = require('./UserAuthorizationHelper').rehydrateUserMappedPatients;

    createPool();
    redisClient = await getClient();
    return redisClient.flushAll();
});

afterEach(async () => {
    await teardownClient();
    await teardownPool();
});

afterAll(async () => {
    jest.unmock('../SessionService');
    jest.unmock('../patient/PatientDao');
    await teardownPool();
});

describe('Given we want to work with the user authorization helper', () => {
    describe('when we want to check if a user is mapped to a patient', () => {
        const userId = 1,
            patientId = 1,
            mappedPatients = [1];
        describe('when the patient id is included of the mappedPatients', () => {
            test('then it should update the cache', async () => {
                const result = await isUserMappedToPatient({userId}, patientId, mappedPatients);
                expect(result).toStrictEqual(true);
            });
        });

        describe('when the patient id is not of the mappedPatients', () => {
            const userId = 1,
                patientId = 1,
                mappedPatients = [2];

            describe('when the patient and the user are not mapped', () => {
                test('then it should return false', async () => {
                    const result = await isUserMappedToPatient({userId}, patientId, mappedPatients);
                    expect(result).toStrictEqual(false);
                });
            });
        });
    });

    describe('when we want to rehydrate just the uses mapped patients in their cache', () => {
        test('then it should query the db if we have a cache miss, but return and empty array if we get no results', async () => {
            const payloadMappedPatientTest = {
                content: 'test'
            };

            await redisClient.set(`users:2`, JSON.stringify(payloadMappedPatientTest));
            patientDao.getAllPatientsIdsByUser.mockReturnValue(Promise.resolve([]));
            await expect(rehydrateUserMappedPatients({userId: 2})).resolves.toEqual([]);
        });

        test('then it should query the db if we have a cache miss, and write in cache the returned value', async () => {
            const payloadMappedPatientTest = {
                content: 'test'
            };
            const returnedPatientsIds = [2, 3];

            await redisClient.set(`users:3`, JSON.stringify(payloadMappedPatientTest));

            patientDao.getAllPatientsIdsByUser.mockReturnValue(
                Promise.resolve(returnedPatientsIds)
            );
            const results = await rehydrateUserMappedPatients({userId: 3});

            expect(patientDao.getAllPatientsIdsByUser).toHaveBeenCalled();
            expect(sessionService.insertSessionMappedPatientByIds).toHaveBeenCalled();
            expect(results).toEqual(returnedPatientsIds);
        });
    });
});
