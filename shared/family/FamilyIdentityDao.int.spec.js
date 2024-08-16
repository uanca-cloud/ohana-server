const {
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER}
    } = require('../constants'),
    {
        patientFixtureData: {testPatient2, testPatient1}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        fixtureData: {user2}
    } = require('../test/fixtures/UsersFixtures');

let pool = null,
    encounterResult = null,
    userResult = null,
    patientResult = null,
    patientResult2 = null,
    bootstrapTest = null,
    truncateTables = null,
    createTestPatient = null,
    insertTestLocation = null,
    createTestEncounter = null,
    insertTestUser = null,
    selectTestUserById = null,
    selectTestFamilyIdentityById = null,
    createTestFamilyIdentity = null,
    selectTestFamilyIdentityByUserId = null,
    selectTestUserPatientMapping = null;

beforeEach(async () => {
    encounterResult = null;
    userResult = null;
    patientResult = null;
    patientResult2 = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    selectTestUserById = require('../test/fixtures/UsersFixtures').selectTestUserById;
    selectTestFamilyIdentityById =
        require('../test/fixtures/FamilyIdentitiesFixtures').selectTestFamilyIdentityById;
    createTestFamilyIdentity =
        require('../test/fixtures/FamilyIdentitiesFixtures').createTestFamilyIdentity;
    selectTestFamilyIdentityByUserId =
        require('../test/fixtures/FamilyIdentitiesFixtures').selectTestFamilyIdentityByUserId;
    selectTestUserPatientMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').selectTestUserPatientMapping;

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

describe('Given we want to query the database for family identities', () => {
    beforeEach(async () => {
        const locationResult = await insertTestLocation(pool, location2);
        userResult = await insertTestUser(pool, user2);
        patientResult = await createTestPatient(pool, {
            ...testPatient2,
            location: locationResult.rows[0].id
        });
        patientResult2 = await createTestPatient(pool, {
            ...testPatient1,
            location: locationResult.rows[0].id
        });

        encounterResult = await createTestEncounter(pool, {
            patientId: patientResult.rows[0].id,
            tenantId: testPatient2.tenantId
        });
    });

    describe('when creating a new family identity', () => {
        it('the correct information should be saved', async () => {
            const {createFamilyIdentity} = require('./FamilyIdentityDao');

            const userId = await createFamilyIdentity(
                {
                    tenantId: testPatient2.tenantId,
                    patientId: patientResult.rows[0].id,
                    isPrimary: false
                },
                'publickey'
            );

            const familyIdentity = await selectTestFamilyIdentityById(pool, userId);
            expect(familyIdentity.rows[0].patient_id).toBe(patientResult.rows[0].id);
            expect(familyIdentity.rows[0].public_key).toBe('publickey');
            expect(familyIdentity.rows[0].phone_number).toBe(null);

            const testUser = await selectTestUserById(pool, familyIdentity.rows[0].user_id);
            expect(parseInt(testUser.rows[0].tenant_id)).toBe(testPatient2.tenantId);
            expect(testUser.rows[0].assigned_roles[0]).toBe(FAMILY_MEMBER);

            const mapping = await selectTestUserPatientMapping(pool, {
                patientId: patientResult.rows[0].id,
                userId: familyIdentity.rows[0].user_id
            });
            expect(mapping.rows[0].patient_id).toBe(patientResult.rows[0].id);
        });
    });

    describe('when creating a new family identity and passing a phone number', () => {
        it('the phone number should be saved', async () => {
            const {createFamilyIdentity} = require('./FamilyIdentityDao');

            const userId = await createFamilyIdentity(
                {
                    tenantId: testPatient2.tenantId,
                    patientId: patientResult.rows[0].id,
                    phoneNumber: '+400750000000',
                    isPrimary: false
                },
                'publickey'
            );

            const familyIdentity = await selectTestFamilyIdentityById(pool, userId);
            expect(familyIdentity.rows[0].phone_number).toBe('+400750000000');
        });
    });

    describe('when retrieving a family member identity', () => {
        it('the correct information should be returned', async () => {
            const {getFamilyMemberIdentity} = require('./FamilyIdentityDao');

            const identityId = await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                patientId: patientResult.rows[0].id,
                invitedBy: user2.userId,
                publicKey: 'publickey',
                role: FAMILY_MEMBER
            });
            const familyIdentity = await getFamilyMemberIdentity(identityId.rows[0].user_id);

            expect(familyIdentity.publicKey).toBe('publickey');
            expect(familyIdentity.userId).toBe(identityId.rows[0].user_id);
            expect(familyIdentity.patientId).toBe(patientResult.rows[0].id);
            expect(familyIdentity.primary).toBe(false);
            expect(familyIdentity.invitedBy).toEqual(
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
        });
    });

    describe('when retrieving a family member', () => {
        it('the correct information should be returned', async () => {
            const {getFamilyMember} = require('./FamilyIdentityDao');

            const identityId = await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                encounterId: encounterResult.rows[0].id,
                publicKey: 'publickey',
                invitedBy: user2.userId,
                role: CAREGIVER
            });
            const familyIdentity = await getFamilyMember(identityId.rows[0].user_id);

            expect(familyIdentity.identityId).toBe(identityId.rows[0].id);
            expect(familyIdentity.userId).toBe(userResult.rows[0].user_id);
            expect(parseInt(familyIdentity.tenantId)).toBe(testPatient2.tenantId);
            expect(familyIdentity.assignedRoles[0]).toBe(FAMILY_MEMBER);
            expect(familyIdentity.acceptedEula).toBe(true);
            expect(familyIdentity.primary).toBe(true);
            expect(familyIdentity.invitedBy).toEqual(
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
        });
    });

    describe('when retrieving an inexistent family member', () => {
        it('the it should return null', async () => {
            const {getFamilyMember} = require('./FamilyIdentityDao');

            const familyIdentity = await getFamilyMember('9999999');

            expect(familyIdentity).toBe(null);
        });
    });

    describe('when removing a family member', () => {
        it('then the record should be deleted', async () => {
            const {removeFamilyMember} = require('./FamilyIdentityDao');

            await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                patientId: patientResult.rows[0].id,
                publicKey: 'publickey'
            });
            await removeFamilyMember(userResult.rows[0].user_id, encounterResult.rows[0].id);

            const familyIdentity = await selectTestFamilyIdentityByUserId(
                pool,
                userResult.rows[0].user_id
            );
            expect(familyIdentity.rowCount).toBe(0);

            const testUser = await selectTestUserById(pool, userResult.rows[0].user_id);
            expect(testUser.rowCount).toBe(0);

            const mapping = await selectTestUserPatientMapping(pool, {
                patientId: patientResult.rows[0].id,
                userId: userResult.rows[0].user_id
            });
            expect(mapping.rowCount).toBe(0);
        });
    });

    describe('When we want to remove identities by batch of patient ids', () => {
        beforeEach(async () => {
            await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                patientId: patientResult.rows[0].id,
                publicKey: 'publickey'
            });
        });
        it('then it should work for valid patient id', async () => {
            const {removeIdentitiesByPatientId} = require('./FamilyIdentityDao');
            await expect(
                removeIdentitiesByPatientId(patientResult.rows[0].id, pool)
            ).resolves.not.toThrow();
        });
    });

    describe('When we want to remove FMs by patient ids', () => {
        it('then it should remove data from all the tables', async () => {
            const {removeFamilyMembersByPatientId} = require('./FamilyIdentityDao');

            await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                patientId: patientResult.rows[0].id,
                publicKey: 'publickey'
            });
            await removeFamilyMembersByPatientId(
                patientResult.rows[0].id,
                [userResult.rows[0].user_id],
                pool
            );

            const familyIdentity = await selectTestFamilyIdentityByUserId(
                pool,
                userResult.rows[0].user_id
            );
            expect(familyIdentity.rowCount).toBe(0);

            const testUser = await selectTestUserById(pool, userResult.rows[0].user_id);
            expect(testUser.rowCount).toBe(0);

            const mapping = await selectTestUserPatientMapping(pool, {
                patientId: patientResult.rows[0].id,
                userId: userResult.rows[0].user_id
            });
            expect(mapping.rowCount).toBe(0);
        });
    });

    describe('When updating a family member`s identity', () => {
        describe('and relationship to patient is not Self/Patient', () => {
            it('should update the entry with isPatient flag set to false', async () => {
                const {updateFamilyMemberIdentity} = require('./FamilyIdentityDao');

                await createTestFamilyIdentity(pool, {
                    userId: userResult.rows[0].user_id,
                    patientId: patientResult.rows[0].id,
                    publicKey: 'publickey'
                });

                await updateFamilyMemberIdentity(
                    pool,
                    '1234567890',
                    'brother',
                    'en',
                    userResult.rows[0].user_id,
                    true,
                    false
                );

                const familyIdentity = await selectTestFamilyIdentityByUserId(
                    pool,
                    userResult.rows[0].user_id
                );

                expect(familyIdentity.rows[0].is_patient).toBe(false);
            });
        });

        describe('and relationship to patient is Self/Patient', () => {
            it('should update the entry with isPatient flag set to true', async () => {
                const {updateFamilyMemberIdentity} = require('./FamilyIdentityDao');

                await createTestFamilyIdentity(pool, {
                    userId: userResult.rows[0].user_id,
                    patientId: patientResult.rows[0].id,
                    publicKey: 'publickey'
                });

                await updateFamilyMemberIdentity(
                    pool,
                    '1234567890',
                    'Self/Patient',
                    'en',
                    userResult.rows[0].user_id,
                    true,
                    false
                );

                const familyIdentity = await selectTestFamilyIdentityByUserId(
                    pool,
                    userResult.rows[0].user_id
                );

                expect(familyIdentity.rows[0].is_patient).toBe(false);
            });
        });
    });

    describe('When updating a family member', () => {
        it('should update the entry', async () => {
            const {updateFamilyMember} = require('./FamilyIdentityDao');

            await createTestFamilyIdentity(pool, {
                userId: userResult.rows[0].user_id,
                patientId: patientResult.rows[0].id,
                publicKey: 'publickey'
            });

            await updateFamilyMember({
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '1234567890',
                patientRelationship: 'brother',
                preferredLocale: 'en',
                userId: userResult.rows[0].user_id,
                primary: true,
                hasPatientRelationship: false
            });

            const familyIdentity = await selectTestFamilyIdentityByUserId(
                pool,
                userResult.rows[0].user_id
            );

            expect(familyIdentity.rows[0].patient_relationship).toBe('brother');
            expect(familyIdentity.rows[0].preferred_locale).toBe('en');
            expect(familyIdentity.rows[0].phone_number).toBe('1234567890');
        });
    });

    describe('When checking if a patient is already registered as a family member', () => {
        describe('and one does not exist', () => {
            it('then it should return false', async () => {
                const {hasPatientUserRegistered} = require('./FamilyIdentityDao');

                expect(
                    await hasPatientUserRegistered(
                        patientResult.rows[0].id,
                        userResult.rows[0].user_id
                    )
                ).toBe(false);
            });
        });

        describe('and one exists', () => {
            it('then it should return true', async () => {
                const {
                    hasPatientUserRegistered,
                    createFamilyIdentity,
                    updateFamilyMember
                } = require('./FamilyIdentityDao');

                const userId = await createFamilyIdentity(
                    {
                        tenantId: testPatient1.tenantId,
                        patientId: patientResult2.rows[0].id,
                        isPrimary: true
                    },
                    'publickey'
                );

                await updateFamilyMember({
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890',
                    patientRelationship: 'Self/Patient',
                    preferredLocale: 'en',
                    userId
                });

                expect(await hasPatientUserRegistered(patientResult2.rows[0].id, userId)).toBe(
                    false
                );
            });
        });
    });
});
