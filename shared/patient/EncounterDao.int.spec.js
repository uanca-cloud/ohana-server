const {
        patientFixtureData: {testPatient2, testPatient4}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        LOCATION_SETTINGS_KEYS: {PATIENT_AUTO_UNENROLLMENT_IN_HOURS}
    } = require('../constants');

let pool = null,
    locationId = null,
    patientResult = null,
    bootstrapTest = null,
    truncateTables = null,
    createTestPatient = null,
    insertTestLocation = null,
    selectTestEncounterByPatientId = null,
    createTestEncounter = null,
    endTestEncounter = null,
    format = null,
    endEncounters = null,
    getInactiveEncounters = null,
    insertTestLocationSetting = null,
    updateEncounters = null,
    isClosedEncounter = null,
    createEncounter = null,
    addEncounter = null,
    updateEncounter = null,
    hasOpenEncounter = null;

beforeEach(async () => {
    patientResult = null;
    locationId = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    selectTestEncounterByPatientId =
        require('../test/fixtures/EncountersFixtures').selectTestEncounterByPatientId;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    endTestEncounter = require('../test/fixtures/EncountersFixtures').endTestEncounter;
    format = require('date-fns').format;
    endEncounters = require('./EncounterDao').endEncounters;
    getInactiveEncounters = require('./EncounterDao').getInactiveEncounters;
    insertTestLocationSetting =
        require('../test/fixtures/LocationSettingsFixtures').insertTestLocationSetting;
    updateEncounters = require('./EncounterDao').updateEncounters;
    isClosedEncounter = require('./EncounterDao').isClosedEncounter;
    createEncounter = require('./EncounterDao').createEncounter;
    addEncounter = require('./EncounterDao').addEncounter;
    updateEncounter = require('./EncounterDao').updateEncounter;
    hasOpenEncounter = require('./EncounterDao').hasOpenEncounter;

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

describe('Given we want to query the database for encounters', () => {
    beforeEach(async () => {
        const location = await insertTestLocation(pool, location2);
        locationId = location.rows[0].id;
        patientResult = await createTestPatient(pool, {...testPatient2, location: locationId});
    });
    describe('when creating a new encounter', () => {
        it('then the correct information should be returned', async () => {
            await createEncounter(
                {
                    patientId: patientResult.rows[0].id,
                    tenantId: testPatient2.tenantId
                },
                pool
            );
            const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

            expect(result.rowCount).toBe(1);
            expect(parseInt(result.rows[0].tenant_id)).toBe(1);
            expect(format(result.rows[0].created_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
            expect(format(result.rows[0].updated_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
            expect(result.rows[0].ended_at).toBe(null);
        });

        describe('and the patient already has a closed encounter', () => {
            it('then a new encounter should be created', async () => {
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                await endTestEncounter(pool, patientResult.rows[0].id);
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

                expect(result.rowCount).toBe(2);
            });
        });

        describe('and the patient already has an ongoing encounter', () => {
            it('then a single encounter should be returned', async () => {
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

                expect(result.rowCount).toBe(1);
            });
        });
    });

    describe('when adding a new encounter to a patient with external id type VN', () => {
        it('then the correct information should be returned', async () => {
            await addEncounter(
                {
                    patientId: patientResult.rows[0].id,
                    tenantId: testPatient4.tenantId,
                    externalId: testPatient4.externalId
                },
                pool
            );
            const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

            expect(result.rowCount).toBe(1);
            expect(parseInt(result.rows[0].tenant_id)).toBe(parseInt(testPatient4.tenantId));
            expect(parseInt(result.rows[0].external_id)).toBe(parseInt(testPatient4.externalId));
            expect(result.rows[0].ended_at).toBe(null);
        });

        describe('and the patient already has a closed encounter', () => {
            it('then a new encounter should be created', async () => {
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                await endTestEncounter(pool, patientResult.rows[0].id);
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

                expect(result.rowCount).toBe(2);
            });
        });

        describe('and the patient already has an ongoing encounter', () => {
            it('then a single encounter should be returned', async () => {
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                await createEncounter(
                    {
                        patientId: patientResult.rows[0].id,
                        tenantId: testPatient2.tenantId
                    },
                    pool
                );
                const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

                expect(result.rowCount).toBe(1);
            });
        });
    });

    describe('when encounter is closed', () => {
        it('then it should return true', async () => {
            const encounter = await createTestEncounter(pool, {
                patientId: patientResult.rows[0].id,
                tenantId: testPatient2.tenantId
            });
            await endTestEncounter(pool, patientResult.rows[0].id);
            const result = await isClosedEncounter(encounter.rows[0].id, pool);

            expect(result).toBe(true);
        });
    });

    describe('when encounter querying if the encounter is closed and the encounter does not exist', () => {
        it('then it should return true', async () => {
            const result = await isClosedEncounter(12345678, pool);

            expect(result).toBe(true);
        });
    });

    describe('when updating multiple encounters', () => {
        it('then update_at should be current date', async () => {
            await createTestEncounter(pool, {
                patientId: patientResult.rows[0].id,
                tenantId: testPatient2.tenantId
            });
            await updateEncounters({patientId: patientResult.rows[0].id}, pool);
            const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

            expect(format(result.rows[0].updated_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
        });
    });

    describe('when updating an encounter', () => {
        it('then update_at should be current date', async () => {
            await createTestEncounter(pool, {
                patientId: patientResult.rows[0].id,
                tenantId: testPatient2.tenantId
            });
            await updateEncounter({encounterId: patientResult.rows[0].encounterId}, pool);
            const result = await selectTestEncounterByPatientId(pool, patientResult.rows[0].id);

            expect(format(result.rows[0].updated_at, 'yyyy-mm-dd')).toBe(
                format(new Date(), 'yyyy-mm-dd')
            );
        });

        describe('and no active encounter exists', () => {
            it('then it should return null', async () => {
                await createTestEncounter(pool, {
                    patientId: patientResult.rows[0].id,
                    tenantId: testPatient2.tenantId
                });
                await endTestEncounter(pool, patientResult.rows[0].id);
                const result = await updateEncounter(
                    {
                        encounterId: patientResult.rows[0].encounterId
                    },
                    pool
                );

                expect(result).toBe(null);
            });
        });
    });

    describe('when checking if a patient has open encounters', () => {
        describe('and there is an open encounter', () => {
            it('then it should return true', async () => {
                await createTestEncounter(pool, {
                    patientId: patientResult.rows[0].id,
                    tenantId: testPatient2.tenantId
                });

                const result = await hasOpenEncounter(
                    patientResult.rows[0].id,
                    testPatient2.tenantId
                );

                expect(result).toBe(true);
            });
        });

        describe('and there is no open encounter', () => {
            it('then it should return false', async () => {
                const result = await hasOpenEncounter(0, 0);

                expect(result).toBe(false);
            });
        });
    });

    describe('When ending a batch of encounters', () => {
        it('then it should work if encounters exist and the arguments are correct', async () => {
            const secondPatientResult = await createTestPatient(pool, {
                ...testPatient4,
                location: locationId
            });
            const encounter1 = await createTestEncounter(pool, {
                patientId: secondPatientResult.rows[0].id,
                tenantId: testPatient4.tenantId
            });

            const encounter2 = await createTestEncounter(pool, {
                patientId: patientResult.rows[0].id,
                tenantId: testPatient2.tenantId
            });

            await expect(
                endEncounters([encounter1.rows[0].id, encounter2.rows[0].id], pool)
            ).resolves.not.toThrow();
        });
    });
    describe('When getting inactive encounters', () => {
        it('then it should return an array if there are results', async () => {
            await insertTestLocationSetting(pool, {
                locationId,
                tenantId: testPatient2.tenantId,
                key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                value: 72
            });
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const encounter = await createTestEncounter(pool, {
                patientId: patientResult.rows[0].id,
                tenantId: testPatient2.tenantId,
                updatedAt: weekAgo
            });

            await expect(getInactiveEncounters(pool)).resolves.toEqual([
                {
                    id: encounter.rows[0].id
                }
            ]);
        });
        it('then it should return null if no results available', async () => {
            await expect(getInactiveEncounters(pool)).resolves.toBeNull();
        });
    });
});
