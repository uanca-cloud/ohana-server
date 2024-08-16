const {
        fixtureData: {deviceInfo2, deviceInfo3, deviceInfo5}
    } = require('../test/fixtures/DeviceInfoFixtures'),
    {
        fixtureData: {user2, user6}
    } = require('../test/fixtures/UsersFixtures'),
    {
        patientFixtureData: {testPatient2, testPatient1}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location1}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        fixtureData: {encounter1}
    } = require('../test/fixtures/EncountersFixtures');

let pool = null,
    bootstrapTest = null,
    truncateTables = null,
    findTestDeviceByUserId = null,
    insertTestUser = null,
    createTestPatient = null,
    insertTestLocation = null,
    createDevice = null,
    updateDevicePushNotificationConfig = null,
    removeDeviceInfo = null,
    getDeviceInfo = null,
    getDeviceInfoByUserId = null,
    removeDeviceInfoByPatientId = null,
    createFamilyIdentity = null,
    removeDeviceInfosByUserIds = null,
    removeDeviceInfoByDeviceId = null,
    getDeviceIdsFromUserIds = null,
    getDeviceInfoForUsers = null,
    getUserAndTenantIdsFromDeviceId = null,
    getDeviceIdsAndNotificationLevelsFromUserIds = null,
    insertTestUserPatientsMapping = null,
    createTestEncounter = null;

beforeEach(async () => {
    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    findTestDeviceByUserId = require('../test/fixtures/DeviceInfoFixtures').findTestDeviceByUserId;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    createDevice = require('./DeviceInfoDao').createDevice;
    updateDevicePushNotificationConfig =
        require('./DeviceInfoDao').updateDevicePushNotificationConfig;
    removeDeviceInfo = require('./DeviceInfoDao').removeDeviceInfo;
    getDeviceInfo = require('./DeviceInfoDao').getDeviceInfo;
    getDeviceIdsFromUserIds = require('./DeviceInfoDao').getDeviceIdsFromUserIds;
    getDeviceInfoForUsers = require('./DeviceInfoDao').getDeviceInfoForUsers;
    getDeviceInfoByUserId = require('./DeviceInfoDao').getDeviceInfoByUserId;
    removeDeviceInfoByPatientId = require('./DeviceInfoDao').removeDeviceInfoByPatientId;
    removeDeviceInfosByUserIds = require('./DeviceInfoDao').removeDeviceInfosByUserIds;
    removeDeviceInfoByDeviceId = require('./DeviceInfoDao').removeDeviceInfoByDeviceId;
    getUserAndTenantIdsFromDeviceId = require('./DeviceInfoDao').getUserAndTenantIdsFromDeviceId;
    createFamilyIdentity = require('../family/FamilyIdentityDao').createFamilyIdentity;
    getDeviceIdsAndNotificationLevelsFromUserIds =
        require('./DeviceInfoDao').getDeviceIdsAndNotificationLevelsFromUserIds;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    insertTestUserPatientsMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').insertTestUserPatientsMapping;

    pool = bootstrapTest();
    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);

    await insertTestUser(pool, user2);
    await createDevice(deviceInfo2);
});

afterEach(async () => {
    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);
    await pool.drain().then(() => pool.clear());
});

afterAll(async () => {
    await pool.drain().then(() => pool.clear());
    jest.unmock('ohana-shared');
    jest.clearAllMocks();
});

describe('Given we want to query the database for device info', () => {
    describe('when creating a new device', () => {
        it('then device information should be retrieved', async () => {
            const result = await getDeviceInfo(deviceInfo2.deviceId);

            expect(result.deviceModel).toBe(deviceInfo2.deviceModel);
            expect(result.osVersion).toBe(deviceInfo2.osVersion);
        });
    });

    describe('when we want to get the device information of a user', () => {
        it('then the correct device should be retrieved', async () => {
            await updateDevicePushNotificationConfig(deviceInfo2);
            const result = await getDeviceInfoByUserId(deviceInfo2.userId);

            expect(result.deviceId).toBe(deviceInfo2.deviceId);
            expect(result.deviceToken).toBe(deviceInfo2.deviceToken);
            expect(result.iv).toBe(deviceInfo2.iv);
            expect(result.notificationPlatform).toBe(deviceInfo2.notificationPlatform);
            expect(result.deviceName).toBe(deviceInfo2.deviceName);
        });
    });

    describe('when we want to get the device information of an incorrect user', () => {
        it('then no rows should be retrieved', async () => {
            const result = await getDeviceInfoByUserId('aaaa');

            expect(result).toBe(null);
        });
    });

    describe('when updating a new device', () => {
        it('then the device should be updated', async () => {
            const updateResult = await updateDevicePushNotificationConfig(deviceInfo2);
            const result = await findTestDeviceByUserId(pool, deviceInfo2.userId);

            expect(result.rows[0].device_id).toBe(deviceInfo2.deviceId);
            expect(result.rows[0].device_name).toBe(deviceInfo2.deviceName);
            expect(result.rows[0].device_model).toBe(deviceInfo2.deviceModel);
            expect(result.rows[0].os_version).toBe(deviceInfo2.osVersion);
            expect(result.rows[0].iv).toBe(deviceInfo2.iv);
            expect(result.rows[0].notification_platform).toBe(deviceInfo2.notificationPlatform);
            expect(result.rows[0].partial_key).toBe(deviceInfo2.partialKey);
            expect(result.rows[0].device_token).toBe(deviceInfo2.deviceToken);
            expect(result.rows[0].app_version).toBe(deviceInfo2.appVersion);

            expect(updateResult.osVersion).toBe(deviceInfo2.osVersion);
            expect(updateResult.deviceModel).toBe(deviceInfo2.deviceModel);
        });
    });

    describe('when creating a new device without a device name', () => {
        it('then the device should be created', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);
            const result = await findTestDeviceByUserId(pool, deviceInfo3.userId);

            expect(result.rows[0].device_id).toBe(deviceInfo3.deviceId);
            expect(result.rows[0].device_name).toBe(null);
            expect(result.rows[0].device_model).toBe(deviceInfo3.deviceModel);
            expect(result.rows[0].os_version).toBe(deviceInfo3.osVersion);
        });
    });

    describe('when creating a duplicate device info row', () => {
        it('then the operation should throw', async () => {
            try {
                await createDevice(deviceInfo2);
            } catch (err) {
                expect(err.detail).toBe(
                    `Key (device_id)=(${deviceInfo2.deviceId}) already exists.`
                );
            }
        });
    });

    describe('when deleting a device', () => {
        it('then nothing should be returned', async () => {
            await removeDeviceInfo(deviceInfo2.userId, pool);
            const result = await findTestDeviceByUserId(pool, deviceInfo2.userId);

            expect(result.rowCount).toBe(0);
        });
    });

    describe('When we want to batch remove device infos by patient ids', () => {
        let patientResult;

        it('then it should remove from db', async () => {
            await insertTestUser(pool, user6);
            const locationResult = await insertTestLocation(pool, location1);
            patientResult = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            await createFamilyIdentity(
                {
                    tenantId: testPatient1.tenantId,
                    patientId: patientResult.rows[0].id,
                    isPrimary: true,
                    isPatient: false
                },
                'publickey'
            );

            await createFamilyIdentity(
                {
                    tenantId: testPatient2.tenantId,
                    patientId: patientResult.rows[0].id,
                    isPrimary: true,
                    isPatient: false
                },
                'publickey'
            );

            await createDevice(deviceInfo3);
            await expect(
                removeDeviceInfoByPatientId(patientResult.rows[0].id, pool)
            ).resolves.not.toThrow();
        });
    });

    describe('When we want to retrieve device ids from user ids', () => {
        it("then it returns null if they don't exist", async () => {
            const result = await getDeviceIdsFromUserIds(['1', '2']);
            expect(result).toBeNull();
        });

        it('then it returns the device ids and user ids', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);
            await createDevice(deviceInfo5);

            const result = await getDeviceIdsFromUserIds([user6.userId], deviceInfo5.deviceId);
            expect(result).toEqual([
                {userId: user6.userId.toString(), deviceId: deviceInfo3.deviceId}
            ]);
        });

        it('then it returns the device ids and user ids when the senderDeviceId value is null', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);
            const result = await getDeviceIdsFromUserIds([user6.userId], null);
            expect(result).toEqual([
                {userId: user6.userId.toString(), deviceId: deviceInfo3.deviceId}
            ]);
        });
    });

    describe('When we want to retrieve device ids and notification levels from user ids and a patient id', () => {
        it("then it returns null if they don't exist", async () => {
            const result = await getDeviceIdsAndNotificationLevelsFromUserIds(['1', '2'], 8);
            expect(result).toBeNull();
        });

        it('then it returns the device ids with notification level', async () => {
            const locationResult = await insertTestLocation(pool, location1);
            const locationId = locationResult.rows[0].id;
            const patientInsert = await createTestPatient(pool, {
                ...testPatient1,
                location: locationId
            });
            await insertTestUser(pool, user6);
            const patientId = patientInsert.rows[0].id;
            const encounterInsert = await createTestEncounter(pool, {...encounter1, patientId});

            const encounterId = encounterInsert.rows[0].id;
            await insertTestUserPatientsMapping(pool, {
                userId: user6.userId,
                patientId,
                encounterId
            });
            deviceInfo3.userId = user6.userId;
            deviceInfo5.userId = user6.userId;
            await createDevice(deviceInfo3);
            await createDevice(deviceInfo5);

            const result = await getDeviceIdsAndNotificationLevelsFromUserIds(
                [user6.userId],
                patientId
            );

            expect(result.length).toBe(2);
        });
    });

    describe('When we want to batch remove device infos by user ids', () => {
        it('then it should remove from db', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);
            await createDevice(deviceInfo5);

            await removeDeviceInfosByUserIds([user6.userId.toString()]);
            const result = await getDeviceInfoByUserId(user6.userId);
            expect(result).toBeNull();
        });
    });

    describe('When we want to remove device infos by the device id', () => {
        it('then it should remove from db', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);
            await createDevice(deviceInfo5);

            await removeDeviceInfoByDeviceId(deviceInfo3.deviceId, deviceInfo3.userId);
            const result = await getDeviceInfoByUserId(user6.userId);
            expect(result.deviceId).toEqual(deviceInfo5.deviceId);
        });
    });

    describe('when we want to get user and tenant from device id', () => {
        it('then we should return the values if we have a match', async () => {
            await insertTestUser(pool, user6);
            await createDevice(deviceInfo3);

            const result = await getUserAndTenantIdsFromDeviceId(deviceInfo3.deviceId);
            expect(result.userId).toEqual(user6.userId.toString());
            expect(result.tenantId).toEqual(user6.tenantId.toString());
        });

        it('then we should return null if we have no match', async () => {
            const result = await getUserAndTenantIdsFromDeviceId(deviceInfo3.deviceId);
            expect(result).toBeNull();
        });
    });

    describe('When we want to retrieve the list of device info for a list of user ids', () => {
        it("then it returns null if they don't exist", async () => {
            const result = await getDeviceInfoForUsers(['1', '2']);
            expect(result).toStrictEqual([]);
        });

        it('then it returns the device ids and user ids', async () => {
            await insertTestUser(pool, user6);
            await createDevice({...deviceInfo3, userId: user6.userId.toString()});
            await updateDevicePushNotificationConfig({
                ...deviceInfo3,
                userId: user6.userId.toString(),
                deviceName: 'Android Phone'
            });

            const result = await getDeviceInfoForUsers([user6.userId]);
            expect(result).toEqual([
                {
                    deviceId: deviceInfo3.deviceId,
                    appVersion: null,
                    deviceModel: null,
                    deviceName: 'Android Phone',
                    deviceToken: 'sdsdddddddddddJ1FTChTZAbqRbHTfhm-dsdsdsds-222222',
                    iv: 'EASDSSAWFhYWFhYWFhYQ==',
                    notificationPlatform: 'gcm',
                    osVersion: null,
                    registrationId: null,
                    userId: null
                }
            ]);
        });
    });
});
