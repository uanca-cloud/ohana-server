const {
        attachmentsFixtures: {attachment1, attachment2, attachment3, attachment4}
    } = require('../test/fixtures/AttachmentsFixtures'),
    {
        fixtureData: {user3}
    } = require('../test/fixtures/UsersFixtures'),
    {
        patientFixtureData: {testPatient2}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        locationsFixtures: {location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        updatesFixtures: {update1}
    } = require('../test/fixtures/UpdatesFixtures'),
    {
        fixtureData: {deviceInfo3}
    } = require('../test/fixtures/DeviceInfoFixtures'),
    {
        ATTACHMENTS_BASE_URL,
        MEDIA_TYPES: {PHOTO, TEXT}
    } = require('../constants');

let pool = null,
    patientResult = null,
    encounterResult = null,
    insertTestAttachment = null,
    selectTestAttachmentById = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestUser = null,
    createTestPatient = null,
    insertTestLocation = null,
    createTestUpdate = null,
    insertTestAuditEvent = null,
    createTestEncounter = null,
    endTestEncounter = null;

afterAll(async () => {
    jest.resetAllMocks();
});

beforeEach(async () => {
    encounterResult = null;
    patientResult = null;

    insertTestAttachment = require('../test/fixtures/AttachmentsFixtures').insertTestAttachment;
    selectTestAttachmentById =
        require('../test/fixtures/AttachmentsFixtures').selectTestAttachmentById;
    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    createTestUpdate = require('../test/fixtures/UpdatesFixtures').createTestUpdate;
    insertTestAuditEvent = require('../test/fixtures/AuditFixtures').insertTestAuditEvent;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    endTestEncounter = require('../test/fixtures/EncountersFixtures').endTestEncounter;

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
        'attachments'
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
        'attachments'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to create a new media update attachment', () => {
    beforeEach(async () => {
        const locationResult = await insertTestLocation(pool, location2);
        await insertTestUser(pool, user3);
        patientResult = await createTestPatient(pool, {
            ...testPatient2,
            location: locationResult.rows[0].id
        });
        encounterResult = await createTestEncounter(pool, {
            patientId: patientResult.rows[0].id,
            tenantId: location2.tenantId
        });
    });
    describe('when creating a new attachment', () => {
        it('then the correct info should be saved', async () => {
            const {createAttachment} = require('./AttachmentsDao');

            await createAttachment({...attachment1, patientId: patientResult.rows[0].id});
            const result = await selectTestAttachmentById(pool, attachment1.id);
            const jsonMetadata = JSON.parse(JSON.stringify(result.rows[0].metadata));
            const expectedJsonMetadata = JSON.parse(JSON.stringify(attachment1.metadata));

            expect(result.rows[0].update_id).toBe(attachment1.updateId);
            expect(jsonMetadata.thumbUrl).toEqual(expectedJsonMetadata.thumbUrl);
            expect(jsonMetadata.originalUrl).toEqual(expectedJsonMetadata.originalUrl);
            expect(jsonMetadata.filename).toEqual(expectedJsonMetadata.filename);
            expect(result.rows[0].type).toBe(attachment1.type);
        });
    });

    describe('when getting attachments by id', () => {
        it('then only one row should be returned', async () => {
            const {getAttachmentById} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            const result = await getAttachmentById(attachment1.id);
            const expectedJsonMetadata = JSON.parse(JSON.stringify(attachment1.metadata));

            expect(result.updateId).toBe(attachment1.updateId);
            expect(result.thumbUrl).toEqual(`${ATTACHMENTS_BASE_URL}${attachment1.id}/thumbnail`);
            expect(result.originalUrl).toEqual(`${ATTACHMENTS_BASE_URL}${attachment1.id}`);
            expect(result.originalFilename).toEqual(expectedJsonMetadata.filename);
            expect(result.type).toBe(attachment1.type);
        });
    });

    describe('when trying to get attachments by invalid id', () => {
        it('then null should be returned', async () => {
            const {getAttachmentById} = require('./AttachmentsDao');

            const result = await getAttachmentById('invalid_id');

            expect(result).toBe(null);
        });
    });

    describe('when getting attachments by filename', () => {
        it('then only one row should be returned', async () => {
            const {getMediaAttachment} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            const result = await getMediaAttachment({
                filename: attachment1.metadata.filename,
                updateId: attachment1.updateId,
                type: PHOTO
            });

            expect(result.id).toBe(attachment1.id);
            expect(result.type).toBe(attachment1.type);
        });
    });

    describe('when trying to get attachments by invalid filename', () => {
        it('then null should be returned', async () => {
            const {getMediaAttachment} = require('./AttachmentsDao');
            const result = await getMediaAttachment({
                filename: 'invalid_filename',
                updateId: attachment1.updateId,
                type: PHOTO
            });

            expect(result).toBe(null);
        });
    });

    describe('when trying to get attachments by invalid update id', () => {
        it('then null should be returned', async () => {
            const {getMediaAttachment} = require('./AttachmentsDao');

            const result = await getMediaAttachment({
                filename: attachment1.metadata.filename,
                updateId: '9999',
                type: PHOTO
            });

            expect(result).toBe(null);
        });
    });

    describe('when trying to get attachments by invalid type', () => {
        it('then null should be returned', async () => {
            const {getMediaAttachment} = require('./AttachmentsDao');

            const result = await getMediaAttachment({
                filename: attachment1.metadata.filename,
                updateId: '9999',
                type: TEXT
            });

            expect(result).toBe(null);
        });
    });

    describe('when getting attachments by update id', () => {
        it('then all associated attachments should be returned', async () => {
            const {getAttachmentsByUpdateId} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            await insertTestAttachment(pool, {
                ...attachment2,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            await insertTestAttachment(pool, {
                ...attachment3,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            const result = await getAttachmentsByUpdateId(attachment1.updateId);

            expect(result.length).toBe(3);
            expect(result[0].id).toBe(attachment1.id);
            expect(result[0].thumbUrl).toEqual(`${ATTACHMENTS_BASE_URL}${result[0].id}/thumbnail`);
            expect(result[0].originalUrl).toEqual(`${ATTACHMENTS_BASE_URL}${result[0].id}`);
            expect(result[0].type).toBe(attachment1.type);
            expect(result[0].quickMessages).toStrictEqual([]);
            expect(result[0].translations).toStrictEqual([]);
            expect(result[0].invitedByFirstName).toBe('');
            expect(result[0].invitedByLastName).toBe('');
            expect(result[0].invitedByUserType).toBe('');
            expect(result[0].inviteeName).toBe('');
            expect(result[0].inviteeRelationship).toBe('');
            expect(result[1].id).toBe(attachment2.id);
            expect(result[1].thumbUrl).toEqual(`${ATTACHMENTS_BASE_URL}${result[1].id}/thumbnail`);
            expect(result[1].originalUrl).toEqual(`${ATTACHMENTS_BASE_URL}${result[1].id}`);
            expect(result[1].type).toBe(attachment2.type);
            expect(result[1].quickMessages).toStrictEqual([]);
            expect(result[1].translations).toStrictEqual([]);
            expect(result[1].invitedByFirstName).toBe('');
            expect(result[1].invitedByLastName).toBe('');
            expect(result[1].invitedByUserType).toBe('');
            expect(result[1].inviteeName).toBe('');
            expect(result[1].inviteeRelationship).toBe('');
            expect(result[2].id).toBe(attachment3.id);
            expect(result[2].thumbUrl).toEqual(null);
            expect(result[2].originalUrl).toEqual(null);
            expect(result[2].type).toBe(attachment3.type);
            expect(result[2].quickMessages).toStrictEqual(
                JSON.parse(JSON.stringify(attachment3.metadata))
            );
            expect(result[2].translations).toStrictEqual([]);
            expect(result[2].invitedByFirstName).toBe('');
            expect(result[2].invitedByLastName).toBe('');
            expect(result[2].invitedByUserType).toBe('');
            expect(result[2].inviteeName).toBe('');
            expect(result[2].inviteeRelationship).toBe('');
        });
    });

    describe('when trying to get attachments by invalid update id', () => {
        it('then null should be returned', async () => {
            const {getAttachmentsByUpdateId} = require('./AttachmentsDao');

            const result = await getAttachmentsByUpdateId('invalid_update_id');

            expect(result).toEqual([]);
        });
    });

    describe('when removing an attachment by id', () => {
        it('then no entries should be found', async () => {
            const {removeAttachmentById} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            await removeAttachmentById(attachment1.id, pool);
            const result = await selectTestAttachmentById(pool, attachment1.id);

            expect(result.rowCount).toBe(0);
        });
    });

    describe('when getting attachments with closed encounters', () => {
        it('then some attachments should be returned', async () => {
            const {removeAttachmentById} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            await removeAttachmentById(attachment1.id, pool);

            const result = await selectTestAttachmentById(pool, attachment1.id);
            expect(result.rowCount).toBe(0);
        });
    });
});

describe('when retrieving attachments associated with an update', () => {
    beforeEach(async () => {
        const locationResult = await insertTestLocation(pool, location2);
        await insertTestUser(pool, user3);
        patientResult = await createTestPatient(pool, {
            ...testPatient2,
            location: locationResult.rows[0].id
        });
        encounterResult = await createTestEncounter(pool, {
            patientId: patientResult.rows[0].id,
            tenantId: testPatient2.tenantId
        });
    });

    describe('and the update is committed', () => {
        it('then all attachments should be returned', async () => {
            const {getUncommittedAttachments} = require('./AttachmentsDao');

            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                updateId: update1.updateId,
                encounterId: encounterResult.rows[0].id
            });
            await insertTestAttachment(pool, {
                ...attachment2,
                patientId: patientResult.rows[0].id,
                updateId: update1.updateId,
                encounterId: encounterResult.rows[0].id
            });
            const result = await getUncommittedAttachments();
            expect(result.length).toBe(2);

            const attachmentData1 = result.find((item) => item.id === attachment1.id);
            const attachmentData2 = result.find((item) => item.id === attachment2.id);
            expect(attachmentData1?.updateId).toBe(update1.updateId);
            expect(attachmentData1?.id).toBe(attachment1.id);
            expect(attachmentData1?.type).toBe(attachment1.type);

            expect(attachmentData2?.updateId).toBe(update1.updateId);
            expect(attachmentData2?.id).toBe(attachment2.id);
            expect(attachmentData2?.type).toBe(attachment2.type);
        });

        it('then the correct attachment should be returned', async () => {
            const {getCommittedAttachmentById} = require('./AttachmentsDao');

            await createTestUpdate(pool, {
                ...update1,
                userId: user3.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
            await insertTestAttachment(pool, {
                ...attachment1,
                patientId: patientResult.rows[0].id,
                updateId: update1.updateId,
                encounterId: encounterResult.rows[0].id
            });
            const result = await getCommittedAttachmentById(attachment1.id);
            const expectedJsonMetadata = JSON.parse(JSON.stringify(attachment1.metadata));

            expect(result.encounterId).toBe(encounterResult.rows[0].id);
            expect(result.updateId).toBe(update1.updateId);
            expect(result.thumbUrl).toBe(expectedJsonMetadata.thumbUrl);
            expect(result.originalUrl).toBe(expectedJsonMetadata.originalUrl);
            expect(result.originalFilename).toBe(expectedJsonMetadata.filename);
            expect(result.type).toBe(attachment1.type);
        });
    });

    describe('when trying to retrieve the attachments by an invalid id', () => {
        describe('when the update was committed', () => {
            it('then null should be returned', async () => {
                const {getCommittedAttachmentById} = require('./AttachmentsDao');

                const result = await getCommittedAttachmentById('123456789');

                expect(result).toBeNull();
            });
        });

        describe('when the update was not committed', () => {
            it('then null should be returned', async () => {
                const {getCommittedAttachmentById} = require('./AttachmentsDao');

                const result = await getCommittedAttachmentById();

                expect(result).toBeNull();
            });
        });
    });

    describe('when getting attachments that are not associated with an encounter', () => {
        describe('and encounter is closed and has attachments', () => {
            it('then all attachments should be returned', async () => {
                const {getAttachmentsForClosedEncounters} = require('./AttachmentsDao');

                await createTestUpdate(pool, {
                    ...update1,
                    userId: user3.userId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });
                await insertTestAuditEvent(pool, {
                    eventId: 'update_sent',
                    patientId: patientResult.rows[0].id,
                    userId: user3.userId,
                    tenantId: user3.tenantId,
                    userType: user3.role,
                    updateId: update1.updateId,
                    userDisplayName: `${user3.lastName}, ${user3.firstName}`,
                    deviceId: deviceInfo3.deviceId,
                    deviceModel: deviceInfo3.deviceModel,
                    osVersion: deviceInfo3.osVersion,
                    appVersion: deviceInfo3.appVersion
                });
                await insertTestAttachment(pool, {
                    ...attachment1,
                    updateId: update1.updateId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });
                await insertTestAttachment(pool, {
                    ...attachment2,
                    updateId: update1.updateId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });
                await endTestEncounter(pool, patientResult.rows[0].id);
                const result = await getAttachmentsForClosedEncounters({
                    tenantId: user3.tenantId,
                    deleteUntil: new Date()
                });
                expect(result.length).toBe(2);

                const attachmentData1 = result.find((item) => item.id === attachment1.id);
                const attachmentData2 = result.find((item) => item.id === attachment2.id);
                expect(attachmentData1.id).toBe(attachment1.id);
                expect(attachmentData1.updateId).toBe(update1.updateId);
                expect(attachmentData1.encounterId).toBe(encounterResult.rows[0].id);
                expect(attachmentData1.originalFilename).toBe(attachment1.metadata.filename);

                expect(attachmentData2.id).toBe(attachment2.id);
                expect(attachmentData2.updateId).toBe(update1.updateId);
                expect(attachmentData2.encounterId).toBe(encounterResult.rows[0].id);
                expect(attachmentData2.originalFilename).toBe(attachment2.metadata.filename);
            });
        });

        describe('and encounter is closed and has no attachments', () => {
            it('then no rows should be returned', async () => {
                const {getAttachmentsForClosedEncounters} = require('./AttachmentsDao');

                await createTestUpdate(pool, {
                    ...update1,
                    userId: user3.userId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });

                await insertTestAuditEvent(pool, {
                    eventId: 'update_sent',
                    patientId: patientResult.rows[0].id,
                    userId: user3.userId,
                    tenantId: user3.tenantId,
                    userType: user3.role,
                    updateId: update1.updateId,
                    userDisplayName: `${user3.lastName}, ${user3.firstName}`,
                    deviceId: deviceInfo3.deviceId,
                    deviceModel: deviceInfo3.deviceModel,
                    osVersion: deviceInfo3.osVersion,
                    appVersion: deviceInfo3.appVersion,
                    messageContent: 'dddd'
                });

                await insertTestAttachment(pool, {
                    ...attachment1,
                    updateId: update1.updateId,
                    patientId: patientResult.rows[0].id
                });
                await insertTestAttachment(pool, {
                    ...attachment2,
                    updateId: update1.updateId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });
                const result = await getAttachmentsForClosedEncounters({
                    tenantId: user3.tenantId,
                    deleteUntil: new Date()
                });

                expect(result).toBe(null);
            });
        });
    });

    describe('when removing the user join attachments by user id', () => {
        describe('when a userJoin attachment exists', () => {
            it('then the attachments should be removed and the update id should be returned', async () => {
                const {removeUserJoinAttachmentByUserIds} = require('./AttachmentsDao');

                await createTestUpdate(pool, {
                    ...update1,
                    userId: user3.userId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });

                await insertTestAttachment(pool, {
                    ...attachment4,
                    updateId: update1.updateId,
                    patientId: patientResult.rows[0].id,
                    encounterId: encounterResult.rows[0].id
                });
                const result = await removeUserJoinAttachmentByUserIds([user3.userId]);

                expect(result).toStrictEqual([update1.updateId]);
            });
        });

        describe('when no userJoin attachment exists', () => {
            it('then it should return null', async () => {
                const {removeUserJoinAttachmentByUserIds} = require('./AttachmentsDao');

                const result = await removeUserJoinAttachmentByUserIds([user3.userId]);

                expect(result).toBe(null);
            });
        });
    });

    describe('When we want to remove user join attachments by patient ids', () => {
        beforeEach(async () => {
            await createTestUpdate(pool, {
                ...update1,
                userId: user3.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            await insertTestAttachment(pool, {
                ...attachment4,
                updateId: update1.updateId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });
        });

        it('then it should work for valid patient ids', async () => {
            const {removeUserJoinAttachmentsByPatientId} = require('./AttachmentsDao');

            await expect(
                removeUserJoinAttachmentsByPatientId(patientResult.rows[0].id, pool)
            ).resolves.not.toThrow();
        });
    });

    describe('When we want to retrieve attachments by update ids', () => {
        it('should return the attachments', async () => {
            const {getAttachmentsByUpdateIds} = require('./AttachmentsDao');
            await createTestUpdate(pool, {
                ...update1,
                userId: user3.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            await insertTestAttachment(pool, {
                ...attachment4,
                updateId: update1.updateId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            const result = await getAttachmentsByUpdateIds([update1.updateId]);

            expect(result[0].updateId).toBe(update1.updateId);
            expect(result[0].type).toBe(attachment4.type);
        });
    });

    describe('When we want to retrieve attachments by update ids and the update does not have attachments', () => {
        it('then it should return an empty array', async () => {
            const {getAttachmentsByUpdateIds} = require('./AttachmentsDao');
            await createTestUpdate(pool, {
                ...update1,
                userId: user3.userId,
                patientId: patientResult.rows[0].id,
                encounterId: encounterResult.rows[0].id
            });

            const result = await getAttachmentsByUpdateIds([update1.updateId]);

            expect(result).toStrictEqual([]);
        });
    });
});
