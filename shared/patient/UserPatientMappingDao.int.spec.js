let pool = null,
    patientResult = null,
    encounterResult = null,
    bootstrapTest = null,
    truncateTables = null,
    createTestPatient = null,
    insertTestLocation = null,
    insertTestUser = null,
    createTestEncounter = null,
    createUserPatientMapping = null,
    removeUserPatientMapping = null,
    getUserPatientMapping = null,
    updateUserPatientMappingDeletedStatus = null,
    removeUserPatientMappingsByUserIds = null,
    selectTestUserPatientMappingByPatientId = null,
    insertTestUserPatientsMapping = null,
    testPatient2 = null,
    location2 = null,
    user1 = null,
    user4 = null,
    user5 = null;

beforeEach(async () => {
    patientResult = null;
    encounterResult = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    createUserPatientMapping = require('./UserPatientMappingDao').createUserPatientMapping;
    removeUserPatientMapping = require('./UserPatientMappingDao').removeUserPatientMapping;
    getUserPatientMapping = require('./UserPatientMappingDao').getUserPatientMapping;
    updateUserPatientMappingDeletedStatus =
        require('./UserPatientMappingDao').updateUserPatientMappingDeletedStatus;
    removeUserPatientMappingsByUserIds =
        require('./UserPatientMappingDao').removeUserPatientMappingsByUserIds;
    selectTestUserPatientMappingByPatientId =
        require('../test/fixtures/UserPatientsMappingFixtures').selectTestUserPatientMappingByPatientId;
    insertTestUserPatientsMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').insertTestUserPatientsMapping;
    testPatient2 = require('../test/fixtures/PatientsFixtures').patientFixtureData.testPatient2;
    location2 = require('../test/fixtures/LocationsFixtures').locationsFixtures.location2;
    user1 = require('../test/fixtures/UsersFixtures').fixtureData.user1;
    user4 = require('../test/fixtures/UsersFixtures').fixtureData.user4;
    user5 = require('../test/fixtures/UsersFixtures').fixtureData.user5;

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

describe('Given we want to query the database for user patients mappings', () => {
    beforeEach(async () => {
        const locationResult = await insertTestLocation(pool, location2);
        await insertTestUser(pool, user5);
        patientResult = await createTestPatient(pool, {
            ...testPatient2,
            location: locationResult.rows[0].id
        });
        encounterResult = await createTestEncounter(pool, {
            patientId: patientResult.rows[0].id,
            tenantId: testPatient2.tenantId
        });
    });

    describe('when creating a new mapping', () => {
        it('the correct information should be returned', async () => {
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user5.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            const result = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id
            );

            expect(result.rowCount).toBe(1);
            expect(parseInt(result.rows[0].user_id)).toBe(user5.userId);
            expect(result.rows[0].encounter_id).toBe(encounterResult.rows[0].id);
        });
    });

    describe('when trying to add a new mapping', () => {
        it('two rows should be returned', async () => {
            await insertTestUser(pool, user4);
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user5.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user4.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            const result = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id
            );

            expect(result.rowCount).toBe(2);
        });
    });

    describe('when trying to remove a mapping by user id', () => {
        it('then the record should be deleted', async () => {
            await insertTestUser(pool, user4);
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user5.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            await removeUserPatientMapping(user5.userId, pool);
            const getDeleted = true;
            const existingMapping = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id
            );
            const deletedMapping = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id,
                getDeleted
            );

            expect(existingMapping.rowCount).toBe(0);
            expect(deletedMapping.rowCount).toBe(0);
        });
    });

    describe('When trying to remove all mappings associated to a set of users', () => {
        it('then the records should be deleted', async () => {
            await insertTestUser(pool, user4);
            await insertTestUser(pool, user1);
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user4.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            await createUserPatientMapping(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user1.userId,
                    encounterId: encounterResult.rows[0].id
                },
                pool
            );
            await removeUserPatientMappingsByUserIds([user4.userId, user1.userId], pool);
            const existingMappings = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id
            );

            expect(existingMappings.rowCount).toBe(0);
        });
    });

    describe('when trying to retrieve a mapping', () => {
        describe('when an entry exists', function () {
            it('one user patient mapping should be returned', async () => {
                await insertTestUser(pool, user4);
                await createUserPatientMapping(
                    {
                        patientId: patientResult.rows[0].id,
                        userId: user5.userId,
                        encounterId: encounterResult.rows[0].id
                    },
                    pool
                );

                const result = await getUserPatientMapping(
                    {
                        patientId: patientResult.rows[0].id,
                        userId: user5.userId,
                        encounterId: encounterResult.rows[0].id
                    },
                    pool
                );

                expect(result.length).toBe(1);
                expect(result[0].patientId).toEqual(patientResult.rows[0].id);
                expect(parseInt(result[0].userId)).toBe(user5.userId);
            });
        });

        describe('when no entry exists', function () {
            it('null should be returned', async () => {
                const result = await getUserPatientMapping(
                    {
                        patientId: patientResult.rows[0].id,
                        userId: user5.userId,
                        encounterId: encounterResult.rows[0].id
                    },
                    pool
                );
                expect(result).toBe(null);
            });
        });
    });

    describe('when updating the deleted status of an existing mapping', () => {
        it('the correct information should be returned', async () => {
            await insertTestUserPatientsMapping(pool, {
                userId: user5.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            const result = await updateUserPatientMappingDeletedStatus(
                {
                    patientId: patientResult.rows[0].id,
                    userId: user5.userId,
                    encounterIds: [encounterResult.rows[0].id],
                    deleted: true
                },
                pool
            );

            const selectedNotDeletedPatient = await selectTestUserPatientMappingByPatientId(
                pool,
                patientResult.rows[0].id
            );

            expect(result).toEqual(true);
            expect(selectedNotDeletedPatient.rowCount).toBe(0);
        });
    });

    describe('When batch removing users patients mappings', () => {
        beforeEach(async () => {
            await insertTestUser(pool, user4);
            await insertTestUserPatientsMapping(pool, {
                userId: user4.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            await insertTestUserPatientsMapping(pool, {
                userId: user5.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
        });

        it('then it should remove entries from db', async () => {
            await expect(
                removeUserPatientMappingsByUserIds([user5.userId], pool)
            ).resolves.not.toThrow();
        });
    });
});
