const {
        fixtureData: {user3, user2}
    } = require('../test/fixtures/UsersFixtures'),
    {
        patientFixtureData: {testPatient2}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        updatesFixtures: {update1, update2, update3}
    } = require('../test/fixtures/UpdatesFixtures');

let pool = null,
    userId = null,
    userTitle = null,
    patientId = null,
    encounterId = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestUser = null,
    createTestPatient = null,
    insertTestLocation = null,
    createTestUpdate = null,
    createTestEncounter = null;

beforeEach(async () => {
    userId = null;
    userTitle = null;
    patientId = null;
    encounterId = null;

    jest.mock('./UpdatesHelper', () => {
        return {
            getUniqueUpdates: jest.fn()
        };
    });

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    createTestUpdate = require('../test/fixtures/UpdatesFixtures').createTestUpdate;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;

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

    const locationResult = await insertTestLocation(pool, location2);
    await insertTestUser(pool, user2);
    await insertTestUser(pool, user3);
    const patientResult = await createTestPatient(pool, {
        ...testPatient2,
        location: locationResult.rows[0].id
    });
    patientId = patientResult.rows[0].id;
    const encounterResult = await createTestEncounter(pool, {
        tenantId: location2.tenantId,
        patientId
    });
    encounterId = encounterResult.rows[0].id;
    userId = user3.userId;
    userTitle = user3.title;
});

afterEach(async () => {
    jest.unmock('./UpdatesHelper');

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

describe('Given we want to create a new update', () => {
    it('Then the correct values should be saved', async () => {
        const {createUpdate, getUpdatesByPatientId} = require('./UpdatesDao');

        await createUpdate({...update1, userId, patientId, encounterId});
        const result = await getUpdatesByPatientId(patientId);
        expect(result[0].user_id).toBe(String(userId));
        expect(result[0].title).toBe(userTitle);
        expect(result[0].message).toBe(update1.text);
        expect(result[0].id).toBe(update1.updateId);
        expect(result[0].read).toBe(false);
    });
});

describe('Given we want to mark an update as read', () => {
    describe('When it is marked successfully', () => {
        it('then the correct values should be saved', async () => {
            const {
                createUpdate,
                getUpdatesByPatientId,
                markUpdatesAsRead
            } = require('./UpdatesDao');

            await createUpdate({...update1, userId, patientId, encounterId});
            await markUpdatesAsRead([update1.updateId], user2.userId, patientId);
            const result = await getUpdatesByPatientId(patientId);

            expect(result[0].user_id).toBe(String(userId));
            expect(result[0].title).toBe(userTitle);
            expect(result[0].message).toBe(update1.text);
            expect(result[0].id).toBe(update1.updateId);
            expect(result[0].read).toBe(true);
        });
    });

    describe('When sending multiple updates to be updated', () => {
        it('only the ones not already marked as read should be returned', async () => {
            const {createUpdate, markUpdatesAsRead} = require('./UpdatesDao');

            await createUpdate({...update1, userId, patientId, encounterId});
            await createUpdate({...update2, userId, patientId, encounterId});
            await markUpdatesAsRead([update1.updateId], user2.userId, patientId);

            const updateIds = await markUpdatesAsRead(
                [update1.updateId, update2.updateId],
                user2.userId,
                patientId
            );

            expect(updateIds.length).toBe(1);
            expect(updateIds[0].id).toBe(update2.updateId);
        });
    });
});

describe('Given we want to remove an update by update id', () => {
    describe('When the update id is not null', () => {
        describe('When the update exists', () => {
            it('then the update should be removed and it should return 1', async () => {
                const {removeUpdateByIds} = require('./UpdatesDao');

                await createTestUpdate(pool, {
                    ...update1,
                    userId: user3.userId,
                    patientId,
                    encounterId
                });

                const result = await removeUpdateByIds([update1.updateId]);

                expect(result).toBe(1);
            });
        });

        describe('When the update does not exist', () => {
            it('then it should return 1', async () => {
                const {removeUpdateByIds} = require('./UpdatesDao');

                const result = await removeUpdateByIds([update1.updateId]);

                expect(result).toBe(0);
            });
        });
    });

    describe('When update id is null', () => {
        it('then it should return 0', async () => {
            const {removeUpdateByIds} = require('./UpdatesDao');

            const result = await removeUpdateByIds(null);

            expect(result).toBe(0);
        });
    });
});

describe('Given that we want to return updated information using an array of update IDs', () => {
    describe('When no updates with a specific update ID exist or no updates exist at all', () => {
        it('then it should return an empty array', async () => {
            const {getUpdateByUpdateIds} = require('./UpdatesDao');

            const result = await getUpdateByUpdateIds(['123456789'], userId);

            expect(result).toStrictEqual([]);
        });
    });

    describe('When the user who created all the updates requests unread counts', () => {
        it('then it should return an empty array', async () => {
            const {getUpdateByUpdateIds, createUpdate} = require('./UpdatesDao');
            await createUpdate({...update1, userId, patientId, encounterId});
            const result = await getUpdateByUpdateIds([update1.updateId], userId);

            expect(result).toStrictEqual([]);
        });
    });

    describe('When updates are created by different users', () => {
        it('then it should return the number of updates not associated with the specified user', async () => {
            const {getUpdateByUpdateIds, createUpdate} = require('./UpdatesDao');

            await createUpdate({...update1, userId: user2.userId, patientId, encounterId});
            const result = await getUpdateByUpdateIds([update1.updateId], userId);

            expect(result.length).toBe(1);
        });
    });
});

describe('Given we want to get the read receipts list for an update', () => {
    describe('When there are no read receipts for that update', () => {
        it('then it should return an empty array', async () => {
            const {getReadReceiptsByUpdateId} = require('./UpdatesDao');
            const result = await getReadReceiptsByUpdateId('123456789');
            expect(result).toStrictEqual([]);
        });
    });

    describe('When there are read receipts for that update', () => {
        it('then it should return the read receipts array', async () => {
            const {
                getReadReceiptsByUpdateId,
                createUpdate,
                markUpdatesAsRead
            } = require('./UpdatesDao');

            await createUpdate({...update1, userId, patientId, encounterId});
            await markUpdatesAsRead([update1.updateId], user2.userId, patientId);
            const result = await getReadReceiptsByUpdateId(update1.updateId);

            expect(result[0].user.firstName).toBe(user2.firstName);
            expect(result[0].user.lastName).toBe(user2.lastName);
            expect(result[0].user.role).toBe(user2.role);
        });
    });
});

describe('Given we want to get the unread updates count', () => {
    describe('When there are NO updates for a given patient and user', () => {
        it('then it should return 0', async () => {
            const {getUnreadUpdatesByPatientId} = require('./UpdatesDao');
            const result = await getUnreadUpdatesByPatientId(patientId, userId);
            expect(parseInt(result)).toStrictEqual(0);
        });
    });

    describe('When there are 2 updates for a given patient', () => {
        describe('When (USER 1) marks 1 update as read', () => {
            describe('When (USER 1) requests unread counts', () => {
                it('then it should return 1 unread count', async () => {
                    const {
                        getUnreadUpdatesByPatientId,
                        createUpdate,
                        markUpdatesAsRead
                    } = require('./UpdatesDao');
                    await createUpdate({...update1, userId, patientId, encounterId});
                    await createUpdate({...update2, userId: user2.userId, patientId, encounterId});
                    await markUpdatesAsRead([update1.updateId], userId, patientId);
                    const result1 = await getUnreadUpdatesByPatientId(patientId, userId);
                    expect(parseInt(result1)).toStrictEqual(1);
                });
            });
        });
        describe('When there are 3 updates for a given patient and 1 is created by USER 2', () => {
            describe('When (USER 1) marks 2 updates as read', () => {
                describe('When (USER 2) requests unread counts', () => {
                    it('then it should return 2 unread counts', async () => {
                        const {
                            getUnreadUpdatesByPatientId,
                            createUpdate,
                            markUpdatesAsRead
                        } = require('./UpdatesDao');
                        await createUpdate({...update1, userId, patientId, encounterId});
                        await createUpdate({
                            ...update2,
                            userId: user2.userId,
                            patientId,
                            encounterId
                        });
                        await createUpdate({
                            ...update3,
                            userId: user3.userId,
                            patientId,
                            encounterId
                        });
                        await markUpdatesAsRead(
                            [update1.updateId, update2.updateId],
                            userId,
                            patientId
                        );
                        const result1 = await getUnreadUpdatesByPatientId(patientId, user2.userId);
                        expect(parseInt(result1)).toStrictEqual(2);
                    });
                });
            });
        });

        describe('When there are 3 updates for a given patient and 2 is created by USER 2', () => {
            describe('When (USER 1) marks 2 updates as read', () => {
                describe('When (USER 2) requests unread counts', () => {
                    it('then it should return 1 unread counts', async () => {
                        const {
                            getUnreadUpdatesByPatientId,
                            createUpdate,
                            markUpdatesAsRead
                        } = require('./UpdatesDao');
                        await createUpdate({...update1, userId, patientId, encounterId});
                        await createUpdate({
                            ...update2,
                            userId: user2.userId,
                            patientId,
                            encounterId
                        });
                        await createUpdate({
                            ...update3,
                            userId: user2.userId,
                            patientId,
                            encounterId
                        });
                        await markUpdatesAsRead(
                            [update1.updateId, update2.updateId],
                            userId,
                            patientId
                        );
                        const result1 = await getUnreadUpdatesByPatientId(patientId, user2.userId);
                        expect(parseInt(result1)).toStrictEqual(1);
                    });
                });
            });
        });
    });
});
