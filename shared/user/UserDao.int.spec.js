const {
        OHANA_ROLES: {CAREGIVER}
    } = require('../constants'),
    {
        patientFixtureData: {testPatient1, testPatient2}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        fixtureData: {user1, user5, user4, user2, user3, user6, user9, user10, user11}
    } = require('../test/fixtures/UsersFixtures'),
    {
        fixtureData: {encounter1}
    } = require('../test/fixtures/EncountersFixtures'),
    {
        locationsFixtures: {location1}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        fixtureData: {deviceInfo2, deviceInfo3, deviceInfo4}
    } = require('../test/fixtures/DeviceInfoFixtures');

let pool = null,
    patientId = null,
    patientId2 = null,
    user = null,
    encounterId = null,
    locationId = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestLocation = null,
    insertTestUser = null,
    selectTestUserById = null,
    createTestPatient = null,
    createTestEncounter = null,
    insertTestUserPatientsMapping = null,
    insertTestDeviceInfo = null,
    createTestFamilyIdentity = null,
    cleanupUsersByIds = null,
    sharesPatientsMapping = null,
    getFamilyMembersWithDevicesByPatientIds = null,
    getUsersByLocationId = null,
    getUsersByIds = null;

beforeEach(async () => {
    patientId = null;
    patientId2 = null;
    user = null;
    encounterId = null;
    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    selectTestUserById = require('../test/fixtures/UsersFixtures').selectTestUserById;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    insertTestUserPatientsMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').insertTestUserPatientsMapping;
    insertTestDeviceInfo = require('../test/fixtures/DeviceInfoFixtures').insertTestDeviceInfo;
    createTestFamilyIdentity =
        require('../test/fixtures/FamilyIdentitiesFixtures').createTestFamilyIdentity;
    cleanupUsersByIds = require('./UserDao').cleanupUsersByIds;
    sharesPatientsMapping = require('./UserDao').sharesPatientsMapping;
    getFamilyMembersWithDevicesByPatientIds =
        require('./UserDao').getFamilyMembersWithDevicesByPatientIds;
    getUsersByLocationId = require('./UserDao').getUsersByLocationId;
    getUsersByIds = require('./UserDao').getUsersByIds;

    pool = bootstrapTest();

    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients',
        'location_settings',
        'location_quick_messages'
    ]);

    const locationInsert = await insertTestLocation(pool, location1);
    locationId = locationInsert.rows[0].id;
    const patientInsert = await createTestPatient(pool, {
        ...testPatient1,
        location: locationId
    });
    const patientInsert2 = await createTestPatient(pool, {
        ...testPatient2,
        location: locationId
    });
    await insertTestUser(pool, user5);
    patientId = patientInsert.rows[0].id;
    patientId2 = patientInsert2.rows[0].id;
    const encounterInsert = await createTestEncounter(pool, {...encounter1, patientId});
    encounterId = encounterInsert.rows[0].id;
    await insertTestUserPatientsMapping(pool, {userId: user5.userId, patientId, encounterId});
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
        'patients',
        'location_settings',
        'location_quick_messages'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for user info', () => {
    describe('When finding a user by user id', () => {
        it('when the user found is a caregiver', async () => {
            const {getUserByUserId} = require('./UserDao');

            const result = await getUserByUserId(user5.userId);

            expect(parseInt(result.id)).toBe(user5.userId);
            expect(result.assignedRoles.toString()).toBe(user5.assignedRoles.toString());
            expect(result.title).toBe(user5.title);
        });
        it('when the user found is a family member', async () => {
            const {getUserByUserId} = require('./UserDao');

            await insertTestUser(pool, user6);
            await createTestFamilyIdentity(pool, {
                ...user6,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user5.userId
            });

            const result = await getUserByUserId(user6.userId);

            expect(parseInt(result.id)).toBe(user6.userId);
            expect(result.assignedRoles.toString()).toBe(user6.assignedRoles.toString());
            expect(result.phoneNumber).toBe(user6.phoneNumber);
            expect(result.preferredLocale).toBe(user6.preferredLocale);
            expect(result.patientRelationship).toBe(user6.patientRelationship);
            expect(result.primary).toBe(false);
        });
        it('when the user is not found', async () => {
            const {getUserByUserId} = require('./UserDao');

            const dummyUserId = user5.userId + 1;
            const result = await getUserByUserId(dummyUserId);

            expect(result).toEqual(expect.arrayContaining([]));
        });
    });

    describe('When finding caregivers by patient id', () => {
        it('When the caregivers are found', async () => {
            const {getCaregiversByPatientId} = require('./UserDao');

            const result = await getCaregiversByPatientId(patientId);

            expect(parseInt(result[0].id)).toBe(user5.userId);
            expect(result[0].assignedRoles.toString()).toBe(user5.assignedRoles.toString());
        });

        it('When the caregivers are not found', async () => {
            const {getCaregiversByPatientId} = require('./UserDao');

            const dummyPatientId = patientId + 1;
            const result = await getCaregiversByPatientId(dummyPatientId);
            expect(result).toEqual(expect.arrayContaining([]));
        });
    });

    describe('When finding family members by encounter id', () => {
        it('then all family members should be returned', async () => {
            const {getFamilyMembersByPatientId} = require('./UserDao');

            await insertTestUser(pool, user6);
            await insertTestUser(pool, user2);
            await insertTestUserPatientsMapping(pool, {
                userId: user6.userId,
                patientId,
                encounterId
            });
            await insertTestUserPatientsMapping(pool, {
                userId: user2.userId,
                patientId,
                encounterId
            });
            await createTestFamilyIdentity(pool, {
                ...user6,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            await createTestFamilyIdentity(pool, {
                ...user2,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            const result = await getFamilyMembersByPatientId(patientId);

            expect(parseInt(result[0].id)).toBe(user6.userId);
            expect(parseInt(result[1].id)).toBe(user2.userId);
        });

        describe('and patient does not exist', () => {
            it('then no family member should be returned', async () => {
                const {getFamilyMembersByPatientId} = require('./UserDao');

                const dummyPatientId = patientId + 1;
                const result = await getFamilyMembersByPatientId(dummyPatientId);
                expect(result).toStrictEqual([]);
            });
        });
    });

    describe('When finding family members by encounter id and tenant id', () => {
        it('then all family members should be returned', async () => {
            const {getFamilyMemberDevices} = require('./UserDao');

            await insertTestUser(pool, user6);
            await insertTestUser(pool, user2);
            await insertTestDeviceInfo(pool, deviceInfo2);
            await insertTestDeviceInfo(pool, deviceInfo3);
            await insertTestUserPatientsMapping(pool, {
                userId: user6.userId,
                patientId,
                encounterId
            });
            await insertTestUserPatientsMapping(pool, {
                userId: user2.userId,
                patientId,
                encounterId
            });
            await createTestFamilyIdentity(pool, {
                ...user6,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            await createTestFamilyIdentity(pool, {
                ...user2,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            const result = await getFamilyMemberDevices(patientId, user6.tenantId);

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: `${user6.userId}`,
                        deviceToken: deviceInfo3.deviceToken,
                        iv: deviceInfo3.iv,
                        partialKey: deviceInfo3.partialKey,
                        notificationPlatform: deviceInfo3.notificationPlatform
                    }),
                    expect.objectContaining({
                        id: `${user2.userId}`,
                        deviceToken: deviceInfo2.deviceToken,
                        iv: deviceInfo2.iv,
                        partialKey: deviceInfo2.partialKey,
                        notificationPlatform: deviceInfo2.notificationPlatform
                    })
                ])
            );
        });

        describe('and encounter does not exist', () => {
            it('then no family member should be returned', async () => {
                const {getFamilyMemberDevices} = require('./UserDao');

                await insertTestUser(pool, user6);
                await insertTestUser(pool, user2);
                await insertTestUserPatientsMapping(pool, {
                    userId: user6.userId,
                    patientId,
                    encounterId
                });
                await createTestFamilyIdentity(pool, {
                    ...user6,
                    encounterId,
                    publicKey: 'publicKey',
                    invitedBy: user2.userId
                });
                const dummyEncounterId = encounterId + 1;
                const result = await getFamilyMemberDevices(dummyEncounterId, user6.tenantId);
                expect(result).toStrictEqual([]);
            });
        });

        describe('and no device is associated to a family member', () => {
            it('then that family member should not be returned', async () => {
                const {getFamilyMemberDevices} = require('./UserDao');

                await insertTestUser(pool, user6);
                await insertTestUser(pool, user2);
                await insertTestDeviceInfo(pool, deviceInfo2);
                await insertTestUserPatientsMapping(pool, {
                    userId: user6.userId,
                    patientId,
                    encounterId
                });
                await insertTestUserPatientsMapping(pool, {
                    userId: user2.userId,
                    patientId,
                    encounterId
                });
                await createTestFamilyIdentity(pool, {
                    ...user6,
                    patientId,
                    publicKey: 'publicKey',
                    invitedBy: user2.userId
                });
                await createTestFamilyIdentity(pool, {
                    ...user2,
                    patientId,
                    publicKey: 'publicKey',
                    invitedBy: user2.userId
                });
                const result = await getFamilyMemberDevices(patientId, user6.tenantId);

                expect(result.length).toBe(1);
            });
        });
    });

    describe('When finding family members by patient id', () => {
        it('When the family member is found', async () => {
            const {getFamilyMembersByPatientId} = require('./UserDao');

            await insertTestUser(pool, user6);
            await insertTestUser(pool, user2);
            await insertTestUserPatientsMapping(pool, {
                userId: user6.userId,
                patientId,
                encounterId
            });
            await createTestFamilyIdentity(pool, {
                ...user6,
                encounterId,
                publicKey: 'publicKey',
                invitedBy: user2.userId,
                role: CAREGIVER,
                assignedRoles: [CAREGIVER]
            });
            const result = await getFamilyMembersByPatientId(patientId);

            expect(parseInt(result[0].id)).toBe(user6.userId);
            expect(result[0].assignedRoles.toString()).toBe(user6.assignedRoles.toString());
            expect(parseInt(result[0].tenant.id)).toBe(user6.tenantId);
            expect(result[0].firstName).toBe(user6.firstName);
            expect(result[0].lastName).toBe(user6.lastName);
            expect(result[0].phoneNumber).toBe(user6.phoneNumber);
            expect(result[0].patientRelationship).toBe(user6.patientRelationship);
            expect(result[0].preferredLocale).toBe(user6.preferredLocale);
            expect(result[0].invitedBy).toEqual(
                expect.objectContaining({
                    firstName: user2.firstName,
                    lastName: user2.lastName,
                    role: user2.role,
                    id: user2.userId.toString(),
                    tenant: {
                        id: user2.tenantId.toString()
                    },
                    acceptedEula: true
                })
            );
            expect(result[0].primary).toBe(true);
        });

        it('When the family member is not found', async () => {
            const {getFamilyMembersByPatientId} = require('./UserDao');

            const dummyPatientId = patientId + 1;
            const result = await getFamilyMembersByPatientId(dummyPatientId);
            expect(result).toEqual(expect.arrayContaining([]));
        });
    });

    describe('When inserting a family member user', () => {
        it('When we provide the right parameters', async () => {
            const {createFamilyMemberUser} = require('./UserDao');

            await createFamilyMemberUser(user2.userId, user2.tenantId, pool);
            const user = await selectTestUserById(pool, user2.userId);
            expect(parseInt(user.rows[0].tenant_id)).toBe(user2.tenantId);
            expect(user.rows[0].assigned_roles.toString()).toBe(user2.assignedRoles.toString());
        });

        it('When we dont provide the right parameters', async () => {
            const {createFamilyMemberUser} = require('./UserDao');

            await createFamilyMemberUser(user4.userId, user4.tenantId, pool);
            const user = await selectTestUserById(pool, user3.userId);
            expect(user.rows).toEqual(expect.arrayContaining([]));
        });
    });

    describe('When updating a family member user', () => {
        it('When we provide the right parameters', async () => {
            const {createFamilyMemberUser, updateFamilyMemberUser} = require('./UserDao');

            await createFamilyMemberUser(user2.userId, user2.tenantId, pool);
            await updateFamilyMemberUser(user2.userId, user2.firstName, user2.lastName, pool);
            const user = await selectTestUserById(pool, user2.userId);

            expect(parseInt(user.rows[0].tenant_id)).toBe(user2.tenantId);
            expect(user.rows[0].assigned_roles.toString()).toBe(user2.assignedRoles.toString());
            expect(user.rows[0].first_name).toBe(user2.firstName);
            expect(user.rows[0].last_name).toBe(user2.lastName);
        });
    });

    describe('When upserting a admin user', () => {
        it('When we provide the right parameters', async () => {
            const {upsertAdminUser} = require('./UserDao');

            await upsertAdminUser({
                userId: user4.userId,
                tenantId: user4.tenantId,
                assignedRoles: user4.assignedRoles,
                firstName: user4.firstName,
                lastName: user4.lastName
            });
            const user = await selectTestUserById(pool, user4.userId);

            expect(parseInt(user.rows[0].tenant_id)).toBe(user4.tenantId);
            expect(user.rows[0].assigned_roles.toString()).toBe(user4.assignedRoles.toString());
            expect(user.rows[0].first_name).toBe(user4.firstName);
            expect(user.rows[0].last_name).toBe(user4.lastName);
        });

        it('When we dont provide the right parameters', async () => {
            const {upsertAdminUser} = require('./UserDao');

            await upsertAdminUser({
                userId: user4.userId,
                tenantId: user4.tenantId,
                assignedRoles: user4.assignedRoles,
                firstName: user4.firstName,
                lastName: user4.lastName
            });
            const user = await selectTestUserById(pool, user3.userId);
            expect(user.rows).toEqual(expect.arrayContaining([]));
        });
    });

    describe('When upserting a caregiver user', () => {
        it('When we provide the right parameters', async () => {
            const {upsertCaregiverUser} = require('./UserDao');

            await upsertCaregiverUser({
                userId: user4.userId,
                tenantId: user4.tenantId,
                assignedRoles: user4.assignedRoles,
                firstName: user4.firstName,
                lastName: user4.lastName,
                title: user4.title,
                email: user4.email
            });
            const user = await selectTestUserById(pool, user4.userId);

            expect(parseInt(user.rows[0].tenant_id)).toBe(user4.tenantId);
            expect(user.rows[0].assigned_roles.toString()).toBe(user4.assignedRoles.toString());
            expect(user.rows[0].title).toBe(user4.title);
            expect(user.rows[0].first_name).toBe(user4.firstName);
            expect(user.rows[0].last_name).toBe(user4.lastName);
            expect(user.rows[0].email).toBe(user4.email);
        });

        it('When we dont provide the right parameters', async () => {
            const {upsertCaregiverUser} = require('./UserDao');

            await upsertCaregiverUser({
                userId: user4.userId,
                tenantId: user4.tenantId,
                assignedRoles: user4.assignedRoles,
                firstName: user4.firstName,
                lastName: user4.lastName,
                email: user4.email
            });
            const user = await selectTestUserById(pool, user3.userId);
            expect(user.rows).toEqual(expect.arrayContaining([]));
        });
    });

    describe('and we want to remove a user', () => {
        it('then the record should be marked as deleted', async () => {
            const {removeUser} = require('./UserDao');
            const getDeleted = true;

            user = await insertTestUser(pool, user1);
            await removeUser(user.rows[0].user_id, pool);
            const existingUser = await selectTestUserById(pool, user.rows[0].user_id);
            const deletedUser = await selectTestUserById(pool, user.rows[0].user_id, getDeleted);

            expect(existingUser.rowCount).toBe(0);
            expect(deletedUser.rowCount).toBe(1);
        });
    });

    describe('and we want to update the EULA acceptance date for a user', () => {
        it('then the last_eula_acceptance_timestamp should not be null', async () => {
            const {updateUserEULAAcceptanceDate} = require('./UserDao');

            user = await insertTestUser(pool, user1);
            await updateUserEULAAcceptanceDate(user.rows[0].user_id);
            const result = await selectTestUserById(pool, user.rows[0].user_id);

            expect(result.rows[0].last_eula_acceptance_timestamp).not.toBeNull();
        });
    });

    describe('When finding users by user id', () => {
        it('When the users are found', async () => {
            const {getCaregiverByUserId} = require('./UserDao');

            const result = await getCaregiverByUserId(user5.userId);

            expect(parseInt(result.id)).toBe(user5.userId);
            expect(result.assignedRoles.toString()).toBe(user5.assignedRoles.toString());
        });

        it('When the users are not found', async () => {
            const {getCaregiverByUserId} = require('./UserDao');

            const result = await getCaregiverByUserId(123457890);
            expect(result).toBeNull();
        });
    });

    describe('When checking if user(s) share a patient mapping', () => {
        describe('When there is one user (example, a cg updating a patient)', () => {
            it('When they share a patient mapping we should return "true"', async () => {
                await insertTestUser(pool, user4);
                await insertTestUserPatientsMapping(pool, {
                    userId: user4.userId,
                    patientId,
                    encounterId
                });

                const result = await sharesPatientsMapping(user4.userId, null, patientId);
                expect(result).toBe(true);
            });
            it(`When they don't share the patient mapping we should return "false"`, async () => {
                await insertTestUser(pool, user9);

                const result = await sharesPatientsMapping(user9.userId, null, patientId);
                expect(result).toBe(false);
            });
        });
        describe('When there are two users (example, a cg updating a fm)', () => {
            it('When they share a patient mapping we should return "true"', async () => {
                await insertTestUser(pool, user6);
                await insertTestUser(pool, user4);
                await insertTestUserPatientsMapping(pool, {
                    userId: user6.userId,
                    patientId,
                    encounterId
                });
                await insertTestUserPatientsMapping(pool, {
                    userId: user4.userId,
                    patientId,
                    encounterId
                });

                const result = await sharesPatientsMapping(user4.userId, user6.userId, patientId);
                expect(result).toBe(true);
            });
            it(`When they don't share the patient mapping we should return "false"`, async () => {
                await insertTestUser(pool, user10);
                await insertTestUser(pool, user11);

                const result = await sharesPatientsMapping(user11.userId, user10.userId, patientId);
                expect(result).toBe(false);
            });
        });
    });

    describe('When cleaning up a batch of user ids', () => {
        it('then it should work if users exist and the arguments are correct', async () => {
            await insertTestUser(pool, user1);
            await insertTestUser(pool, user2);

            await expect(
                cleanupUsersByIds([user1.userId, user2.userId], pool)
            ).resolves.not.toThrow();
        });
    });

    describe('When fetching all family members device information', () => {
        it('then it should return all device information correctly', async () => {
            await insertTestUser(pool, user6);
            await insertTestUser(pool, user2);
            await insertTestDeviceInfo(pool, deviceInfo2);
            await insertTestUserPatientsMapping(pool, {
                userId: user6.userId,
                patientId,
                encounterId
            });
            await insertTestUserPatientsMapping(pool, {
                userId: user2.userId,
                patientId: patientId2,
                encounterId
            });
            await createTestFamilyIdentity(pool, {
                ...user6,
                patientId,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            await createTestFamilyIdentity(pool, {
                ...user2,
                patientId: patientId2,
                publicKey: 'publicKey',
                invitedBy: user2.userId
            });
            const results = await getFamilyMembersWithDevicesByPatientIds([patientId, patientId2]);

            expect(results).not.toBeNull();
            expect(results[0].deviceToken).toBe(deviceInfo2.deviceToken);
        });
    });

    describe('when we want to get all users for a location', () => {
        it('should return the users', async () => {
            await insertTestUser(pool, user2);
            await insertTestDeviceInfo(pool, deviceInfo2);
            await insertTestUserPatientsMapping(pool, {
                userId: user2.userId,
                patientId: patientId2,
                encounterId
            });
            const results = await getUsersByLocationId(locationId);
            expect(parseInt(results[0].userId)).toEqual(user2.userId);
            expect(results[0].deviceId).toEqual(deviceInfo2.deviceId);
        });

        it('should return an empty array', async () => {
            const results = await getUsersByLocationId(locationId);
            expect(results).toEqual([]);
        });
    });

    describe('When fetching all users linked to a patient', () => {
        describe('When no user is linked to a patient', () => {
            it('should return an empty array', async () => {
                const {getUserIdsLinkedToPatient} = require('./UserDao');

                const results = await getUserIdsLinkedToPatient(patientId, '1234');

                expect(results.length).toBe(0);
            });
        });

        describe('When users are linked to a patient', () => {
            it('should return all users linked to that patient', async () => {
                const {getUserIdsLinkedToPatient} = require('./UserDao');

                const result = await getUserIdsLinkedToPatient(patientId, user5.tenantId);

                expect(parseInt(result[0].id)).toBe(user5.userId);
                expect(result[0].role.toString()).toBe(user5.assignedRoles.toString());
            });
        });
    });

    describe('When fetching all users and their devices that are tied to a patient', () => {
        describe('when a relationship does not exist between a user and that patient', () => {
            it('should return an empty array', async () => {
                const {getUsersAndDevicesByPatientId} = require('./UserDao');

                const results = await getUsersAndDevicesByPatientId(patientId2);

                expect(results.length).toBe(0);
            });
        });

        describe('When a relationship does exist between a user and that patient', () => {
            it('should return all users and their devices', async () => {
                const {getUsersAndDevicesByPatientId} = require('./UserDao');

                await insertTestDeviceInfo(pool, deviceInfo4);

                const results = await getUsersAndDevicesByPatientId(patientId, 'dummy-device-id');

                expect(parseInt(results[0].userId)).toEqual(user5.userId);
                expect(results[0].deviceId).toEqual(deviceInfo4.deviceId);
            });
        });
    });

    describe('When we want to retrieve user info for chat sender', () => {
        it('then it returns null if user is not found', async () => {
            const {getChatUserInfoById} = require('./UserDao');

            const result = await getChatUserInfoById(1);
            expect(result).toBeNull();
        });

        it('then it returns the user info', async () => {
            const {getChatUserInfoById} = require('./UserDao');

            await insertTestUser(pool, user6);

            const result = await getChatUserInfoById(user6.userId);

            expect(parseInt(result.id)).toBe(user6.userId);
            expect(result.assignedRoles.toString()).toBe(user6.assignedRoles.toString());
            expect(result.firstName).toBe(user6.firstName);
            expect(result.lastName).toBe(user6.lastName);
            expect(result.role).toBe(user6.role);
        });
    });

    describe('when we want to get a list of users by their user_ids', () => {
        it('should return all matching users', async () => {
            await insertTestUser(pool, user1);
            await insertTestUser(pool, user2);
            const results = await getUsersByIds([user1.userId, user2.userId]);
            expect(parseInt(results[0].id)).toEqual(user1.userId);
            expect(parseInt(results[1].id)).toEqual(user2.userId);
            expect(results[0].role).toEqual(user1.role);
            expect(results[1].role).toEqual(user2.role);
        });

        it('should return an empty array if none are found', async () => {
            const results = await getUsersByIds(['123']);
            expect(results).toEqual([]);
        });
    });
});
