const {
        patientFixtureData: {testPatient4, testPatient3, testPatient2, testPatient1}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location1, location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        fixtureData: {user1, user3}
    } = require('../test/fixtures/UsersFixtures'),
    {
        fixtureData: {encounter1, encounter2}
    } = require('../test/fixtures/EncountersFixtures');

let pool = null,
    patient = null,
    patientWithVN = null,
    encounter = null,
    encounterWithVN = null,
    locationResult = null,
    locationResult2 = null,
    isAllowSecondaryFamilyMemberForPatient = null,
    truncateTables = null,
    bootstrapTest = null,
    createTestPatient = null,
    selectTestPatientByField = null,
    insertTestLocation = null,
    insertTestUser = null,
    selectTestEncounterByPatientId = null,
    createTestEncounter = null,
    endTestEncounter = null,
    addTestEncounterToPatient = null,
    selectTestUserPatientMapping = null,
    selectTestUserPatientMappingByPatientId = null,
    insertTestUserPatientsMapping = null,
    format = null;

beforeEach(async () => {
    patient = null;
    patientWithVN = null;
    encounter = null;
    encounterWithVN = null;
    locationResult = null;
    locationResult2 = null;

    isAllowSecondaryFamilyMemberForPatient =
        require('./PatientDao').isAllowSecondaryFamilyMemberForPatient;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    selectTestPatientByField =
        require('../test/fixtures/PatientsFixtures').selectTestPatientByField;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    selectTestEncounterByPatientId =
        require('../test/fixtures/EncountersFixtures').selectTestEncounterByPatientId;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    endTestEncounter = require('../test/fixtures/EncountersFixtures').endTestEncounter;
    addTestEncounterToPatient =
        require('../test/fixtures/EncountersFixtures').addTestEncounterToPatient;
    selectTestUserPatientMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').selectTestUserPatientMapping;
    selectTestUserPatientMappingByPatientId =
        require('../test/fixtures/UserPatientsMappingFixtures').selectTestUserPatientMappingByPatientId;
    insertTestUserPatientsMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').insertTestUserPatientsMapping;
    format = require('date-fns').format;

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

afterAll(async () => {
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to enroll a new patient', function () {
    beforeEach(async () => {
        locationResult = await insertTestLocation(pool, location1);
        locationResult2 = await insertTestLocation(pool, location2);
    });

    describe('when getting the enrollment info', () => {
        beforeEach(async () => {
            const {enrollPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            const dateOfBirthUTC = new Date(`${testPatient3.dateOfBirth}T00:00:00Z`);
            patient = await enrollPatient({
                ...testPatient3,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles,
                dateOfBirth: dateOfBirthUTC
            });
        });

        it(`the correct patient should be returned`, async () => {
            const result = await selectTestEncounterByPatientId(pool, patient.id);
            const dateOfBirthFormatted = format(
                new Date(`${testPatient3.dateOfBirth}T00:00:00Z`),
                'yyyy-MM-dd'
            );
            expect(patient.externalIdType).toBe(testPatient3.externalIdType);
            expect(patient.firstName).toBe(testPatient3.firstName);
            expect(patient.lastName).toBe(testPatient3.lastName);
            expect(patient.dateOfBirth).toEqual(dateOfBirthFormatted);
            expect(patient.location).toEqual(
                expect.objectContaining({id: locationResult.rows[0].id, label: location1.label})
            );
            expect(patient.encounterId).toBe(result.rows[0].id);
        });

        it('the correct encounter should be returned', async () => {
            const results = await selectTestEncounterByPatientId(pool, patient.id);
            const {tenant_id, created_at, ended_at} = results.rows[0];
            expect(parseInt(tenant_id)).toBe(1);
            expect(format(created_at, 'yyyy-MM-dd')).toBe(format(new Date(), 'yyyy-MM-dd'));
            expect(ended_at).toBe(null);
        });

        it('the correct user to patient mapping should be returned', async () => {
            const encounter = await selectTestEncounterByPatientId(pool, patient.id);
            const results = await selectTestUserPatientMapping(pool, {
                patientId: patient.id,
                userId: user3.userId
            });

            expect(results.rows[0].encounter_id).toBe(encounter.rows[0].id);
        });
    });

    describe('when trying to enroll a patient as administrator', () => {
        it('nothing should happen', async () => {
            const {enrollPatient} = require('./PatientDao');

            await insertTestUser(pool, user1);
            const result = await enrollPatient({
                ...testPatient3,
                location: locationResult.rows[0].id,
                userId: user1.userId,
                role: user1.role,
                assignedRoles: user1.assignedRoles
            });

            expect(result).toBe(null);
        });
    });

    describe('when trying to enroll the same patient twice', () => {
        it('then it should throw', async () => {
            const {enrollPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            await enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });

            enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            })
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_UNIQUE');
                });
        });
    });

    describe('when adding a new encounter to a patient with external id type VN', () => {
        it('then it should return the correct patient', async () => {
            const {addEncounterToPatient, enrollPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            const addedPatient = await enrollPatient({
                ...testPatient4,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });

            await addEncounterToPatient({
                ...addedPatient,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles,
                tenantId: testPatient4.tenantId
            });

            const result = await selectTestEncounterByPatientId(pool, addedPatient.id);
            expect(addedPatient.externalIdType).toBe(testPatient4.externalIdType);
            expect(addedPatient.firstName).toBe(testPatient4.firstName);
            expect(addedPatient.lastName).toBe(testPatient4.lastName);
            expect(format(new Date(addedPatient.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient4.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(addedPatient.location).toEqual(
                expect.objectContaining({id: locationResult.rows[0].id, label: location1.label})
            );
            expect(addedPatient.encounterId).toBe(result.rows[0].id);
        });
    });

    describe('when trying to add a new encounter to a patient with external id type VN as administrator', () => {
        it('nothing should happen', async () => {
            const {addEncounterToPatient} = require('./PatientDao');

            await insertTestUser(pool, user1);
            const result = await addEncounterToPatient({
                ...testPatient4,
                location: locationResult.rows[0].id,
                userId: user1.userId,
                role: user1.role,
                assignedRoles: user1.assignedRoles
            });

            expect(result).toBe(null);
        });
    });

    describe('when we want to update a patient', () => {
        beforeEach(async () => {
            const {enrollPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            patient = await enrollPatient({
                ...testPatient3,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
        });

        it('then the new updated patient should be returned', async () => {
            const {updatePatient} = require('./PatientDao');

            const result = await updatePatient(
                {
                    firstName: testPatient3.firstName,
                    lastName: testPatient3.lastName,
                    dateOfBirth: testPatient3.dateOfBirth,
                    location: locationResult2.rows[0].id,
                    id: patient.id,
                    tenantId: testPatient3.tenantId
                },
                null
            );
            const encounterResult = await selectTestEncounterByPatientId(pool, patient.id);

            expect(result.externalIdType).toBe(testPatient3.externalIdType);
            expect(result.firstName).toBe(testPatient3.firstName);
            expect(result.lastName).toBe(testPatient3.lastName);
            expect(format(new Date(result.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient3.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(result.location).toEqual(
                expect.objectContaining({id: locationResult2.rows[0].id, label: location2.label})
            );
            expect(result.encounterId).toBe(encounterResult.rows[0].id);
        });
    });

    describe('when we want to update a patient that does not exist', () => {
        it('then nothing should be returned', async () => {
            const {updatePatient} = require('./PatientDao');

            const result = await updatePatient(
                {
                    firstName: 'different name',
                    id: 1234,
                    dateOfBirth: '1991-03-15'
                },
                null
            );

            expect(result).toBe(null);
        });
    });

    describe('when we want to query the database for patients', () => {
        beforeEach(async () => {
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            patientWithVN = await createTestPatient(pool, {
                ...testPatient2,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            encounterWithVN = await addTestEncounterToPatient(pool, {
                ...encounter2,
                patientId: patientWithVN.rows[0].id
            });
        });

        it('then we should find a patient by id and encounter', async () => {
            const {getPatientByIdAndEncounter} = require('./PatientDao');

            const result = await getPatientByIdAndEncounter(
                {
                    id: patient.rows[0].id,
                    encounterId: encounter.rows[0].id
                },
                pool
            );

            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.externalId).toBe(testPatient1.externalId);
            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.lastName).toBe(testPatient1.lastName);
            expect(format(new Date(result.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient1.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(result.encounterId).toBe(encounter.rows[0].id);
            expect(result.location.label).toBe(location1.label);
            expect(result.location.id).toBe(locationResult.rows[0].id);
        });

        describe('and external id type is VN', () => {
            it('then the correct externalId value should be returned', async () => {
                const {getPatientByIdAndEncounter} = require('./PatientDao');

                const result = await getPatientByIdAndEncounter(
                    {
                        id: patientWithVN.rows[0].id,
                        encounterId: encounterWithVN.rows[0].id
                    },
                    pool
                );

                expect(result.firstName).toBe(testPatient2.firstName);
                expect(result.externalId).toBe(testPatient2.externalId);
                expect(result.firstName).toBe(testPatient2.firstName);
                expect(result.lastName).toBe(testPatient2.lastName);
                expect(result.encounterId).toBe(encounterWithVN.rows[0].id);
                expect(result.location.label).toBe(location1.label);
                expect(result.location.id).toBe(locationResult.rows[0].id);
            });
        });

        describe('and patient does not exist', () => {
            it('then it should return null', async () => {
                const {getPatientByIdAndEncounter} = require('./PatientDao');

                const result = await getPatientByIdAndEncounter(
                    {
                        id: patient.rows[0].id,
                        encounterId: encounterWithVN.rows[0].id
                    },
                    pool
                );

                expect(result).toBe(null);
            });
        });

        describe('and encounter is closed', () => {
            it('then no patient should be returned', async () => {
                const {getPatientByIdAndEncounter} = require('./PatientDao');

                await endTestEncounter(pool, patient.rows[0].id);
                const result = await getPatientByIdAndEncounter(
                    {
                        id: patient.rows[0].id,
                        encounterId: encounter.rows[0].id
                    },
                    pool
                );

                expect(result).toBe(null);
            });
        });

        describe('and encounter is closed', () => {
            it('then no patient should be returned', async () => {
                const {getPatientById} = require('./PatientDao');

                await endTestEncounter(pool, patient.rows[0].id);
                const result = await getPatientById(
                    {
                        externalId: testPatient1.externalId,
                        tenantId: testPatient1.tenantId
                    },
                    null
                );

                expect(result).toBe(null);
            });
        });

        it('then we should find a patient by external id', async () => {
            const {getPatientById} = require('./PatientDao');

            const result = await getPatientById(
                {
                    externalId: testPatient1.externalId,
                    tenantId: testPatient1.tenantId
                },
                null
            );

            expect(result.externalId).toBe(testPatient1.externalId);
            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.lastName).toBe(testPatient1.lastName);
            expect(format(new Date(result.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient1.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(result.encounterId).toBe(encounter.rows[0].id);
            expect(result.location.label).toBe(location1.label);
            expect(result.location.id).toBe(locationResult.rows[0].id);
        });

        it('then we should find a patient by id', async () => {
            const {getPatientById} = require('./PatientDao');

            const result = await getPatientById(
                {
                    id: patient.rows[0].id,
                    tenantId: testPatient1.tenantId
                },
                null
            );

            expect(result.externalId).toBe(testPatient1.externalId);
            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.lastName).toBe(testPatient1.lastName);
            expect(format(new Date(result.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient1.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(result.encounterId).toBe(encounter.rows[0].id);
            expect(result.location.label).toBe(location1.label);
            expect(result.location.id).toBe(locationResult.rows[0].id);
        });

        it('then we should find a patient by encounter id', async () => {
            const {getPatientByEncounterId} = require('./PatientDao');

            const result = await getPatientByEncounterId(encounter.rows[0].id);

            expect(result.externalId).toBe(testPatient1.externalId);
            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.lastName).toBe(testPatient1.lastName);
            expect(format(new Date(result.dateOfBirth), 'yyyy-MM-dd')).toBe(
                format(new Date(testPatient1.dateOfBirth), 'yyyy-MM-dd')
            );
            expect(result.encounterId).toBe(encounter.rows[0].id);
            expect(result.location.label).toBe(location1.label);
            expect(result.location.id).toBe(locationResult.rows[0].id);
        });

        it('get location id by encounter id', async () => {
            const {getLocationIdByEncounterId} = require('./PatientDao');

            const result = await getLocationIdByEncounterId(encounter.rows[0].id);
            expect(result).toBe(locationResult.rows[0].id);
        });

        describe('and the patient does not exist', () => {
            it('then it should return null', async () => {
                const {getPatientByEncounterId} = require('./PatientDao');

                expect(await getPatientByEncounterId(12345789)).toBe(null);
            });
        });
    });

    describe('when getting the list of patients that belong to a user', () => {
        it('all the patients should be returned', async () => {
            const {enrollPatient, getPatientsByUser} = require('./PatientDao');

            await insertTestUser(pool, user3);
            await enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient2,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient3,
                location: locationResult2.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient4,
                location: locationResult2.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            const result = await getPatientsByUser({
                userId: user3.userId,
                tenantId: user3.tenantId
            });

            expect(result.length).toBe(4);
        });
    });

    describe('when getting the list of patients and list is empty', () => {
        it('then empty array should be returned', async () => {
            const {getPatientsByUser} = require('./PatientDao');

            const result = await getPatientsByUser({
                userId: user3.userId,
                tenantId: user3.tenantId
            });

            expect(result).toEqual([]);
        });
    });

    describe('when assigning a new user to a patient', () => {
        it('it should update encounter', async () => {
            const {assignUserToPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            await assignUserToPatient({
                patientId: patient.rows[0].id,
                encounterId: encounter.rows[0].id,
                userId: user3.userId
            });
            const encounterResult = await selectTestEncounterByPatientId(pool, patient.rows[0].id);

            expect(format(encounterResult.rows[0].updated_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
        });
    });

    describe('when assigning an existing patient to caregiver after that caregiver disassociated that patient', () => {
        it('it should update encounter and the user patients mapping', async () => {
            const {assignUserToPatient} = require('./PatientDao');

            await insertTestUser(pool, user3);
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            await insertTestUserPatientsMapping(pool, {
                userId: user3.userId,
                patientId: patient.rows[0].id,
                encounterId: encounter.rows[0].id,
                deleted: true
            });
            await assignUserToPatient({
                patientId: patient.rows[0].id,
                encounterId: encounter.rows[0].id,
                userId: user3.userId
            });
            const encounterResult = await selectTestEncounterByPatientId(pool, patient.rows[0].id);
            const userPatientMapping = await selectTestUserPatientMappingByPatientId(
                pool,
                patient.rows[0].id
            );

            expect(format(encounterResult.rows[0].updated_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
            expect(userPatientMapping.rows[0].deleted).toBe(false);
        });
    });

    describe('when retrieving an active patient by the cdr id', () => {
        describe('and the patient does not exist', () => {
            it('then it should return null', async () => {
                const {getPatientByCdrId} = require('./PatientDao');

                const addedPatient = await createTestPatient(pool, {
                    ...testPatient2,
                    location: locationResult.rows[0].id,
                    cdrId: '12345-6789'
                });
                await createTestEncounter(pool, {
                    ...encounter1,
                    patientId: addedPatient.rows[0].id
                });

                const result = await getPatientByCdrId('12345', 1);

                expect(result).toEqual(null);
            });
        });

        describe('and the patient exists', () => {
            it('then it should return the data', async () => {
                const {enrollPatient, getPatientByCdrId} = require('./PatientDao');

                await insertTestUser(pool, user3);
                await enrollPatient({
                    ...testPatient4,
                    location: locationResult2.rows[0].id,
                    userId: user3.userId,
                    role: user3.role,
                    assignedRoles: user3.assignedRoles,
                    cdrId: '12345-6789'
                });

                const result = await getPatientByCdrId('12345-6789', 1);

                expect(result.externalId).toEqual(testPatient4.externalId);
                expect(result.externalIdType).toEqual(testPatient4.externalIdType);
            });
        });
    });

    describe('when updating the allow secondary field for a patient', () => {
        it('should update the field on the patient entry', async () => {
            const {updatePatientAllowSecondary} = require('./PatientDao');

            await insertTestUser(pool, user3);
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            await updatePatientAllowSecondary(
                {
                    patientId: patient.rows[0].id,
                    allowSecondary: true
                },
                null
            );

            const patientResult = await selectTestPatientByField(pool, 'id', patient.rows[0].id);

            expect(patientResult.rows[0].allow_secondary).toBe(true);
        });
    });

    describe('when checking if patient allows secondary family members', () => {
        describe('when allows_secondary is true on patient', () => {
            it('then true should be returned', async () => {
                const allowSecondary = true;
                patient = await createTestPatient(pool, {
                    ...testPatient1,
                    allowSecondary,
                    location: locationResult.rows[0].id
                });

                const result = await isAllowSecondaryFamilyMemberForPatient(patient.rows[0].id);

                expect(result).toBe(true);
            });
        });

        describe('when allows_secondary is false on patient', () => {
            it('then false should be returned', async () => {
                const allowSecondary = false;
                patient = await createTestPatient(pool, {
                    ...testPatient1,
                    allowSecondary,
                    location: locationResult.rows[0].id
                });

                const result = await isAllowSecondaryFamilyMemberForPatient(patient.rows[0].id);

                expect(result).toBe(false);
            });
        });
    });

    describe('When we want to retrieve the location from the patient id', () => {
        beforeEach(async () => {
            patient = await createTestPatient(pool, {
                ...testPatient1,
                allowSecondary: true,
                location: locationResult.rows[0].id
            });
        });

        it('then we should get a result if it exists', async () => {
            const {getLocationIdByPatientId} = require('./PatientDao');
            await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            await expect(
                getLocationIdByPatientId(
                    {
                        ...testPatient1,
                        patientId: patient.rows[0].id
                    },
                    pool
                )
            ).resolves.toEqual(locationResult.rows[0].id);
        });

        it('then we should get null if does not exist', async () => {
            const {getLocationIdByPatientId} = require('./PatientDao');
            await expect(
                getLocationIdByPatientId(
                    {
                        ...testPatient1,
                        patientId: patient.rows[0].id
                    },
                    pool
                )
            ).resolves.toEqual(null);
        });
    });

    describe('when we want to unenroll a patient by id', () => {
        let patientId = null;
        beforeEach(async () => {
            await insertTestUser(pool, user3);
            const firstResult = await createTestPatient(pool, {
                ...testPatient1,
                allowSecondary: true,
                location: locationResult.rows[0].id
            });
            patientId = firstResult.rows[0].id;
        });

        it('then we cleanup Chat Channel information', async () => {
            const {unenrollPatientsById} = require('./PatientDao');
            const {addPatientChatChannelInformation} = require('./PatientDao');
            const {getPatientById} = require('./PatientDao');
            await addPatientChatChannelInformation(
                patientId,
                testPatient1.patientUlid,
                testPatient1.tenantId,
                user3.userId
            );
            await expect(unenrollPatientsById(patientId, pool)).resolves.not.toThrow();
            const result = await getPatientById(
                {
                    externalId: testPatient1.externalId,
                    tenantId: testPatient1.tenantId
                },
                pool
            );

            expect(result.location.id).toBe(null);
            expect(result.patientUlid).toBe(null);
        });
    });

    describe('When we want to update the external id value on a patient', () => {
        it('then the new updated patient should be returned', async () => {
            const {updatePatientExternalId} = require('./PatientDao');

            patient = await createTestPatient(pool, {
                ...testPatient1,
                allowSecondary: true,
                location: locationResult.rows[0].id
            });

            const result = await updatePatientExternalId(
                {
                    externalId: testPatient3.externalId,
                    patientId: patient.rows[0].id,
                    tenantId: testPatient3.tenantId
                },
                null
            );

            expect(result.externalId).toBe(testPatient3.externalId);
        });

        describe('and the patient does not exist', () => {
            it('then it should return null', async () => {
                const {updatePatientExternalId} = require('./PatientDao');

                const result = await updatePatientExternalId(
                    {
                        externalId: testPatient3.externalId,
                        patientId: 123456789,
                        tenantId: testPatient3.tenantId
                    },
                    null
                );

                expect(result).toBe(null);
            });
        });
    });

    describe('when getting the list of patient Ids that belong to a user', () => {
        it('all the patient Ids should be returned', async () => {
            const {enrollPatient, getAllPatientsIdsByUser} = require('./PatientDao');

            await insertTestUser(pool, user3);
            const patient = await enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient2,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient3,
                location: locationResult2.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            await enrollPatient({
                ...testPatient4,
                location: locationResult2.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            const result = await getAllPatientsIdsByUser({
                userId: user3.userId,
                tenantId: user3.tenantId
            });

            expect(result.length).toBe(4);
            expect(result).toBeInstanceOf(Array);
            expect(result[0]).toBe(patient.id);
        });
    });

    describe('When we want to retrieve the active encounters from the patient id', () => {
        it('then we should get a result if it exists', async () => {
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            const {getPatientActiveEncountersById} = require('./PatientDao');
            const result = await getPatientActiveEncountersById(patient.rows[0].id, pool);

            expect(result.encounterIds[0]).toEqual(encounter.rows[0].id);
        });

        it('then we should get null if does not exist', async () => {
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            const {getPatientActiveEncountersById} = require('./PatientDao');
            await endTestEncounter(pool, patient.rows[0].id);

            const result = await getPatientActiveEncountersById(patient.rows[0].id, pool);

            expect(result).toBeNull();
        });
    });

    describe('When we want to add the patient ulid value to a patient', () => {
        describe('When the patient does not exist', () => {
            it('should return null', async () => {
                const {addPatientChatChannelInformation} = require('./PatientDao');

                const result = await addPatientChatChannelInformation(
                    12345678,
                    testPatient1.patientUlid,
                    testPatient1.tenantId,
                    testPatient1.ccCreatorUserId
                );

                expect(result).toBe(null);
            });
        });

        describe('When the patient exists', () => {
            it('should return the updated patient entry ', async () => {
                const {addPatientChatChannelInformation, enrollPatient} = require('./PatientDao');

                await insertTestUser(pool, user3);
                const patient = await enrollPatient({
                    ...testPatient1,
                    location: locationResult.rows[0].id,
                    userId: user3.userId,
                    role: user3.role,
                    assignedRoles: user3.assignedRoles
                });

                const result = await addPatientChatChannelInformation(
                    patient.id,
                    testPatient1.patientUlid,
                    testPatient1.tenantId,
                    user3.userId
                );

                expect(result.patientUlid).toBe(testPatient1.patientUlid);
                expect(result.id).toBe(patient.id);
            });
        });
    });

    describe('When we want to update if chat is enabled for a patient', () => {
        it('then we should see that chat enabled is updated on that patient', async () => {
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            const {updateChatEnabledToPatient} = require('./PatientDao');
            const chatEnabled = false;
            const result = await updateChatEnabledToPatient(patient.rows[0].id, chatEnabled);

            expect(result.enableChat).toEqual(chatEnabled);
        });
    });

    describe('When we want to retrieve the id from patient ulid', () => {
        it('then we should get null for no match', async () => {
            const {getPatientIdFromUlid} = require('./PatientDao');

            const result = await getPatientIdFromUlid('123');
            expect(result).toBeNull();
        });

        it('then we should get the patient id', async () => {
            const {
                addPatientChatChannelInformation,
                enrollPatient,
                getPatientIdFromUlid
            } = require('./PatientDao');

            await insertTestUser(pool, user3);
            const patient = await enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });

            await addPatientChatChannelInformation(
                patient.id,
                testPatient1.patientUlid,
                testPatient1.tenantId,
                user3.userId
            );

            const result = await getPatientIdFromUlid(testPatient1.patientUlid);
            expect(result).toEqual(patient.id);
        });
    });

    describe('When we want to retrieve data from multiple patients by their patient ulids', () => {
        it('then we should get null for no match', async () => {
            const {getPatientsByUlids} = require('./PatientDao');

            const result = await getPatientsByUlids(['123']);
            expect(result.length).toEqual(0);
        });

        it('then we should get the patients', async () => {
            const {
                addPatientChatChannelInformation,
                enrollPatient,
                getPatientsByUlids
            } = require('./PatientDao');

            await insertTestUser(pool, user3);
            const patient = await enrollPatient({
                ...testPatient1,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });
            const patient2 = await enrollPatient({
                ...testPatient2,
                location: locationResult.rows[0].id,
                userId: user3.userId,
                role: user3.role,
                assignedRoles: user3.assignedRoles
            });

            await addPatientChatChannelInformation(
                patient.id,
                testPatient1.patientUlid,
                testPatient1.tenantId,
                user3.userId
            );
            await addPatientChatChannelInformation(
                patient2.id,
                testPatient2.patientUlid,
                testPatient2.tenantId,
                user3.userId
            );

            const result = await getPatientsByUlids([
                testPatient1.patientUlid,
                testPatient2.patientUlid
            ]);
            expect(result.length).toEqual(2);
        });
    });

    describe('When trying to retrieve the patient chat information', () => {
        it('then it should return the patient information', async () => {
            const {getPatientChatInformationByIdAndUserId} = require('./PatientDao');

            await insertTestUser(pool, user3);
            patient = await createTestPatient(pool, {
                ...testPatient1,
                location: locationResult.rows[0].id
            });
            encounter = await createTestEncounter(pool, {
                ...encounter1,
                patientId: patient.rows[0].id
            });
            await insertTestUserPatientsMapping(pool, {
                userId: user3.userId,
                patientId: patient.rows[0].id,
                encounterId: encounter.rows[0].id,
                deleted: false
            });

            const result = await getPatientChatInformationByIdAndUserId(
                {id: patient.rows[0].id, tenantId: user3.tenantId},
                user3.userId
            );

            expect(result.externalId).toBe(testPatient1.externalId);
            expect(result.firstName).toBe(testPatient1.firstName);
            expect(result.lastName).toBe(testPatient1.lastName);
            expect(result.encounterId).toBe(encounter.rows[0].id);
            expect(result.location.label).toBe(location1.label);
            expect(result.location.id).toBe(locationResult.rows[0].id);
            expect(result.notificationLevel).toBe('mute');
        });
    });
});
