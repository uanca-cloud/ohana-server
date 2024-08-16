const {
        attachmentsFixtures: {attachment1, attachment2}
    } = require('../test/fixtures/AttachmentsFixtures'),
    {
        fixtureData: {user2}
    } = require('../test/fixtures/UsersFixtures'),
    {
        MEDIA_TYPES: {TEXT, USER_JOIN}
    } = require('../constants');

let userCacheHelper = null,
    updatesDao = null,
    attachmentsDao = null,
    getAttachmentsForUpdates = null,
    getReadReceiptsForUpdates = null,
    getUniqueUpdates = null,
    getUpdates = null,
    removeUserJoinUpdatesByPatientId = null;

beforeEach(() => {
    jest.mock('../user/UserCacheHelper', () => ({
        rehydrateUser: jest.fn()
    }));

    jest.mock('./UpdatesDao', () => ({
        getUpdatesByPatientId: jest.fn(),
        getUpdateByUpdateIds: jest.fn(),
        markUpdatesAsReadByUpdateIds: jest.fn(),
        removeUpdateByIds: jest.fn(),
        getReadReceiptsByUpdateId: jest.fn(() => [])
    }));

    jest.mock('./AttachmentsDao', () => ({
        removeUserJoinAttachmentsByPatientId: jest.fn()
    }));

    jest.mock('../DatabasePoolFactory', () => ({
        getDatabasePool: jest.fn(() => null)
    }));

    userCacheHelper = require('../user/UserCacheHelper');

    updatesDao = require('./UpdatesDao');
    attachmentsDao = require('./AttachmentsDao');
    getAttachmentsForUpdates = require('./UpdatesHelper').getAttachmentsForUpdates;
    getReadReceiptsForUpdates = require('./UpdatesHelper').getReadReceiptsForUpdates;
    getUniqueUpdates = require('./UpdatesHelper').getUniqueUpdates;
    getUpdates = require('./UpdatesHelper').getUpdates;
    removeUserJoinUpdatesByPatientId = require('./UpdatesHelper').removeUserJoinUpdatesByPatientId;
});

afterAll(() => {
    jest.unmock('../user/UserCacheHelper');
    jest.unmock('./UpdatesDao');
});

describe('given we want to extract attachments for updates from raw query data', () => {
    describe("when we don't care about additional fields", () => {
        test('then we receive an object with results if we have data', () => {
            const updateData = [
                {
                    attachment_id: attachment1.id,
                    update_id: attachment1.updateId,
                    type: attachment1.type,
                    read: false
                },
                {
                    attachment_id: attachment2.id,
                    update_id: attachment2.updateId,
                    type: attachment2.type,
                    read: false
                }
            ];
            const result = getAttachmentsForUpdates(updateData, false, false);
            expect(result[attachment1.updateId][0].id).toEqual(attachment1.id);
            expect(result[attachment1.updateId][0].type).toEqual(attachment1.type);
            expect(result[attachment1.updateId][1].id).toEqual(attachment2.id);
            expect(result[attachment1.updateId][1].type).toEqual(attachment2.type);
        });

        test("then we receive an empty object if we don't have data", () => {
            const result = getAttachmentsForUpdates([], false, false);
            expect(result).toEqual({});
        });
    });

    describe('when we want to also include additional fields', () => {
        test('then we receive additional fields if we need them', () => {
            const updateData = [
                {
                    attachment_id: attachment1.id,
                    update_id: attachment1.updateId,
                    type: USER_JOIN,
                    read: false,
                    metadata: {
                        invitedByFirstName: 'Jon',
                        invitedByLastName: 'Doe',
                        invitedByUserType: 'Test'
                    }
                }
            ];
            const result = getAttachmentsForUpdates(updateData, false, true);
            expect(result[attachment1.updateId][0].invitedByFirstName).toEqual('Jon');
            expect(result[attachment1.updateId][0].invitedByLastName).toEqual('Doe');
            expect(result[attachment1.updateId][0].invitedByUserType).toEqual('Test');
        });

        test('then we get the metadata for text translations if enabled', () => {
            const updateData = [
                {
                    attachment_id: attachment1.id,
                    update_id: attachment1.updateId,
                    type: TEXT,
                    read: false,
                    metadata: {
                        lorem: 'ipsum'
                    }
                }
            ];
            const result = getAttachmentsForUpdates(updateData, true, true);
            expect(result[attachment1.updateId][0].translations).toEqual({
                lorem: 'ipsum'
            });
        });

        test('then we get an empty array if translations are not enabled', () => {
            const updateData = [
                {
                    attachment_id: attachment1.id,
                    update_id: attachment1.updateId,
                    type: TEXT,
                    read: false,
                    metadata: {
                        lorem: 'ipsum'
                    }
                }
            ];
            const result = getAttachmentsForUpdates(updateData, false, true);
            expect(result[attachment1.updateId][0].translations).toEqual([]);
        });
    });
});

describe('Given we want to extract the read receipts for updates', () => {
    describe('when we have data', () => {
        test('then we return an object with the results', async () => {
            const date = new Date().toISOString();
            const updateData = [
                {
                    id: attachment1.updateId,
                    user_id: '123',
                    read_at: date,
                    read_by: user2.userId
                }
            ];
            userCacheHelper.rehydrateUser.mockReturnValue(Promise.resolve(user2));
            const result = await getReadReceiptsForUpdates(updateData);
            expect(result[attachment1.updateId][0].timestamp).toEqual(date);
            expect(userCacheHelper.rehydrateUser).toHaveBeenCalledWith(user2.userId);
        });
    });
});

describe('Given we want to retrieve the unique updates', () => {
    describe('when we have correct data', () => {
        test('then we get the updates in the desired format', async () => {
            const date = new Date().toISOString();
            const updateData = [
                {
                    id: attachment1.updateId,
                    attachment_id: null,
                    update_id: null,
                    type: null,
                    read: true,
                    created_at: new Date(),
                    read_receipts: {
                        [user2.userId]: date
                    },
                    user_id: user2.id,
                    assigned_roles: [user2.role]
                },
                {
                    id: attachment1.updateId,
                    attachment_id: attachment1.id,
                    update_id: attachment1.updateId,
                    type: attachment1.type,
                    read: true,
                    created_at: new Date(),
                    read_receipts: {
                        [user2.userId]: date
                    },
                    user_id: user2.id,
                    assigned_roles: [user2.role]
                }
            ];
            userCacheHelper.rehydrateUser.mockReturnValue(Promise.resolve(user2));
            const result = await getUniqueUpdates(updateData, false, false);
            expect(result.length).toEqual(1);
            expect(result[0].id).toEqual(attachment1.updateId);
            expect(result[0].caregiver.id).toEqual(user2.id);
            expect(result[0].attachments.length).toEqual(1);
            expect(result[0].readReceipts.length).toEqual(1);
        });
    });
});

describe('Given we want to retrieve the parsed updates', () => {
    describe('when we have the encounter id', () => {
        test('then we should call the db function with it', async () => {
            await getUpdates(1, false);
            expect(updatesDao.getUpdatesByPatientId).toHaveBeenCalledWith(1);
        });
    });
});

describe('Given we want to cleanup user join updates', () => {
    describe('When removing user join updates and attachments', () => {
        test('then the remove updates function will be called with the ids retrieved from remove attachments', async () => {
            attachmentsDao.removeUserJoinAttachmentsByPatientId.mockResolvedValue([
                'update1',
                'update2',
                'update3'
            ]);
            await removeUserJoinUpdatesByPatientId('patient1');
            expect(updatesDao.removeUpdateByIds).toHaveBeenCalledWith(
                ['update1', 'update2', 'update3'],
                undefined
            );
        });
    });
});
