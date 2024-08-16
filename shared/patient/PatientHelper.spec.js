const {
        fixtureData: {deviceInfo1, deviceInfo2}
    } = require('../test/fixtures/DeviceInfoFixtures'),
    {
        patientFixtureData: {testPatient4}
    } = require('../test/fixtures/PatientsFixtures');

const patientsToUnenroll = [
    {
        encounterId: 1,
        patientId: 1,
        tenantId: '0000',
        userId: 1
    }
];

let fmIdentityDao = null,
    patientDao = null,
    chatDao = null,
    encounterDao = null,
    locationSettingDao = null,
    sessionService = null,
    notificationHub = null,
    userAuthHelper = null,
    unEnrollPatients = null,
    recipientsUnenrollmentNotify = null,
    updatePatientData = null,
    deletePatientsChatChannel = null;

beforeEach(() => {
    jest.mock('../SessionService', () => ({
        deleteSessionsByUserIds: jest.fn(),
        removeSessionMappedPatientForAllUsers: jest.fn()
    }));

    jest.mock('../tenant/TenantSettingsDao', () => ({
        getTenantSetting: jest.fn()
    }));

    jest.mock('../location/LocationSettingsDao', () => ({
        getLocationSetting: jest.fn(() => ({key: 'allowSecondaryFamilyMembers', value: 'true'}))
    }));

    jest.mock('./EncounterDao', () => ({
        hasOpenEncounter: jest.fn(() => true)
    }));

    jest.mock('./PatientDao', () => ({
        unenrollPatientsById: jest.fn(),
        updatePatientAllowSecondary: jest.fn(),
        updatePatient: jest.fn()
    }));

    jest.mock('../user/UserDao', () => ({
        getFamilyMembersWithDevicesByPatientIds: jest.fn(),
        getCaregiversByPatientIdWithClosedEncounters: jest.fn(() => [])
    }));

    jest.mock('../user/UserAuthorizationHelper', () => ({
        isUserMappedToPatient: jest.fn(() => true)
    }));

    jest.mock('../DaoHelper', () => ({
        runWithTransaction: (cb) => cb({})
    }));

    jest.mock('../family/FamilyIdentityDao', () => ({
        removeFamilyMembersByPatientId: jest.fn()
    }));

    jest.mock('../AzureNotificationHubGateway', () => ({
        createNotificationHub: jest.fn(),
        generatePushNotificationPayload: jest.fn(),
        sendPushNotification: jest.fn()
    }));

    jest.mock('../chat/ChatDao', () => ({
        deleteChatChannel: jest.fn(() => true)
    }));

    fmIdentityDao = require('../family/FamilyIdentityDao');
    patientDao = require('./PatientDao');
    encounterDao = require('./EncounterDao');
    chatDao = require('../chat/ChatDao');
    locationSettingDao = require('../location/LocationSettingsDao');
    sessionService = require('../SessionService');
    notificationHub = require('../AzureNotificationHubGateway');
    userAuthHelper = require('../user/UserAuthorizationHelper');

    unEnrollPatients = require('./PatientHelper').unEnrollPatients;
    recipientsUnenrollmentNotify = require('./PatientHelper').recipientsUnenrollmentNotify;
    updatePatientData = require('./PatientHelper').updatePatientData;
    deletePatientsChatChannel = require('./PatientHelper').deletePatientsChatChannel;
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
});

describe('Given we want to unenroll patients', () => {
    describe('When we have patients awaiting unenrollment', () => {
        test('then we should not have errors', async () => {
            await expect(unEnrollPatients(patientsToUnenroll)).resolves.not.toThrow();
        });

        test('then we should remove the FMs', async () => {
            await unEnrollPatients(patientsToUnenroll);

            expect(fmIdentityDao.removeFamilyMembersByPatientId).toHaveBeenCalled();
        });

        test('then we should unenroll patients from db', async () => {
            await unEnrollPatients(patientsToUnenroll);

            expect(patientDao.unenrollPatientsById).toHaveBeenCalled();
        });

        test('then we should remove redis sessions by user ids', async () => {
            await unEnrollPatients(patientsToUnenroll);

            expect(sessionService.deleteSessionsByUserIds).toHaveBeenCalled();
        });
    });

    describe('when we have no patients to unenroll', () => {
        test('then we should throw an error if the function argument is incorrect', async () => {
            await expect(unEnrollPatients(null)).rejects.toThrow();
        });
    });
});

describe('given we want to notify FMs of their unenrollment', () => {
    describe('when they have device info', () => {
        test('then we send them notifications', async () => {
            const recipientDevices = [deviceInfo1, deviceInfo2];
            await recipientsUnenrollmentNotify(recipientDevices);
            expect(notificationHub.generatePushNotificationPayload).toHaveBeenCalled();
            expect(notificationHub.sendPushNotification).toHaveBeenCalled();
        });
    });

    describe('when they do not have device info', () => {
        test('then we just exit the function', async () => {
            await expect(recipientsUnenrollmentNotify(null)).resolves.not.toThrow();
        });
    });
});

describe('given we want to update patient data', () => {
    describe('when we have no active encounter', () => {
        test('then it should throw', async () => {
            encounterDao.hasOpenEncounter.mockReturnValueOnce(Promise.resolve(false));
            await expect(
                updatePatientData(testPatient4, {userId: 1, tenantId: 1})
            ).rejects.toThrow();
        });
    });

    describe('when we have at least one active encounter', () => {
        test('then it should throw if CG is not associated', async () => {
            userAuthHelper.isUserMappedToPatient.mockReturnValueOnce(Promise.resolve(false));
            await expect(
                updatePatientData(testPatient4, {userId: 1, tenantId: 1})
            ).rejects.toThrow();
        });

        test('then it should update FM setting if allowed', async () => {
            await updatePatientData(testPatient4, {userId: 1, tenantId: 1});
            expect(patientDao.updatePatientAllowSecondary).toHaveBeenCalled();
        });

        test('then it should not update FM setting if not allowed', async () => {
            locationSettingDao.getLocationSetting.mockReturnValueOnce(
                Promise.resolve({
                    key: 'allowSecondaryFamilyMembers',
                    value: 'false'
                })
            );
            await updatePatientData(testPatient4, {userId: 1, tenantId: 1});
            expect(patientDao.updatePatientAllowSecondary).not.toHaveBeenCalled();
        });

        test('then update the patient data', async () => {
            patientDao.updatePatient.mockReturnValueOnce(Promise.resolve(testPatient4));
            await expect(
                updatePatientData(testPatient4, {userId: 1, tenantId: 1})
            ).resolves.toEqual(testPatient4);
        });

        test('then return null if patient data was not updated', async () => {
            patientDao.updatePatient.mockReturnValueOnce(Promise.resolve(null));
            await expect(
                updatePatientData(testPatient4, {userId: 1, tenantId: 1})
            ).resolves.toBeNull();
        });
    });

    describe('when we have at least one patient with chat channel association', () => {
        test('then it should Remove it', async () => {
            await expect(
                deletePatientsChatChannel([
                    {
                        ccCreatorUserId: 'e671b4a5-8147-423c-b7cf-3fddb508767b',
                        patientUlid: '01J07PY88WZW9ACHDHCK1B2QJX',
                        tenantId: 'e046f32e-f97c-eb11-9889-00155d03ff5d'
                    }
                ])
            ).resolves.not.toThrow();
        });
        describe('when CSA deleteChatChannel is throwing an error', () => {
            test('then it should continue ', async () => {
                chatDao.deleteChatChannel.mockReturnValueOnce(
                    Promise.reject(new Error('Rejected Promise Error'))
                );
                await expect(
                    deletePatientsChatChannel([
                        {
                            ccCreatorUserId: 'e671b4a5-8147-423c-b7cf-3fddb508767b',
                            patientUlid: '01J07PY88WZW9ACHDHCK1B2QJX',
                            tenantId: 'e046f32e-f97c-eb11-9889-00155d03ff5d'
                        }
                    ])
                ).resolves.not.toThrow();
            });
        });
    });
});
