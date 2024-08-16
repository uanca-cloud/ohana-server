let pool = null,
    locationId = null,
    messageId = null,
    messageId2 = null,
    messageId3 = null,
    quickMessages = [
        {text: 'Smth 1', locale: 'en_US'},
        {text: 'Smth 2', locale: 'en_GB'}
    ],
    quickMessagesUpdated = [
        {text: 'Smth 3', locale: 'en_US'},
        {text: 'Smth 4', locale: 'en_GB'}
    ],
    bootstrapTest = null,
    truncateTables = null,
    insertTestLocation = null,
    DBError = null,
    UserInputError = null,
    getLocationQuickMessageById = null,
    getLocationQuickMessages = null,
    deleteLocationQuickMessage = null,
    updateLocationQuickMessage = null,
    updateLocationQuickMessagesOrder = null,
    createLocationQuickMessage = null,
    createSiteWideQuickMessage = null,
    getAllLocationQuickMessages = null,
    location2 = null,
    MAX_SITE_WIDE_QUICK_MESSAGES = null,
    MAX_QUICK_MESSAGES = null;

beforeEach(async () => {
    locationId = null;
    messageId = null;
    messageId2 = null;
    messageId3 = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    DBError = require('../custom-errors').DBError;
    UserInputError = require('../custom-errors').UserInputError;
    getLocationQuickMessageById = require('./QuickMessagesDao').getLocationQuickMessageById;
    getLocationQuickMessages = require('./QuickMessagesDao').getLocationQuickMessages;
    deleteLocationQuickMessage = require('./QuickMessagesDao').deleteLocationQuickMessage;
    updateLocationQuickMessage = require('./QuickMessagesDao').updateLocationQuickMessage;
    updateLocationQuickMessagesOrder =
        require('./QuickMessagesDao').updateLocationQuickMessagesOrder;
    createLocationQuickMessage = require('./QuickMessagesDao').createLocationQuickMessage;
    createSiteWideQuickMessage = require('./QuickMessagesDao').createSiteWideQuickMessage;
    getAllLocationQuickMessages = require('./QuickMessagesDao').getAllLocationQuickMessages;
    location2 = require('../test/fixtures/LocationsFixtures').locationsFixtures.location2;
    MAX_SITE_WIDE_QUICK_MESSAGES = require('../constants').MAX_QUICK_MESSAGES;
    MAX_QUICK_MESSAGES = require('../constants').MAX_SITE_WIDE_QUICK_MESSAGES;

    pool = bootstrapTest();

    await truncateTables(pool, [
        'location_quick_messages',
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients',
        'location_settings'
    ]);
});

afterEach(async () => {
    await truncateTables(pool, [
        'location_quick_messages',
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients',
        'location_settings'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for system quick messages', () => {
    beforeEach(async () => {
        const locationResult = await insertTestLocation(pool, location2);
        locationId = locationResult.rows[0].id;
        const createResult = await createLocationQuickMessage({
            locationId,
            quickMessages,
            tenantId: location2.tenantId
        });
        const createResult2 = await createLocationQuickMessage({
            locationId,
            quickMessages,
            tenantId: location2.tenantId
        });
        const createResult3 = await createSiteWideQuickMessage({
            quickMessages,
            tenantId: location2.tenantId
        });
        messageId = createResult.messageId;
        messageId2 = createResult2.messageId;
        messageId3 = createResult3.messageId;
    });
    describe('When we are querying for location quick messages', () => {
        describe('and quick messages exist', () => {
            it('then it should return the quick messages', async () => {
                const fetchResult = await getLocationQuickMessages({
                    locationId,
                    tenantId: location2.tenantId
                });
                expect(fetchResult[0].messageId).toEqual(messageId2);
                expect(fetchResult[0].quickMessages).toEqual(quickMessages);
            });
        });

        describe('and quick messages do not exist', () => {
            it('then it should return an empty list', async () => {
                const fetchResult = await getLocationQuickMessages({locationId, tenantId: 2});
                expect(fetchResult).toEqual([]);
            });
        });
    });

    describe('When we are querying for site wide quick messages', () => {
        describe('and quick messages exist', () => {
            it('then it should return the quick messages', async () => {
                const fetchResult = await getLocationQuickMessages({tenantId: location2.tenantId});
                expect(fetchResult[0].messageId).toEqual(messageId3);
                expect(fetchResult[0].quickMessages).toEqual(quickMessages);
            });
        });

        describe('and quick messages do not exist', () => {
            it('then it should return an empty list', async () => {
                const fetchResult = await getLocationQuickMessages({tenantId: 2});
                expect(fetchResult).toEqual([]);
            });
        });
    });

    describe('When we are querying for all quick messages', () => {
        describe('and quick messages exist', () => {
            it('then it should return the quick messages', async () => {
                const fetchResult = await getAllLocationQuickMessages({
                    locationId,
                    tenantId: location2.tenantId
                });
                expect(fetchResult[0].messageId).toEqual(messageId2);
                expect(fetchResult[0].quickMessages).toEqual(quickMessages);
                expect(fetchResult[1].messageId).toEqual(messageId);
                expect(fetchResult[1].quickMessages).toEqual(quickMessages);
                expect(fetchResult[2].messageId).toEqual(messageId3);
                expect(fetchResult[2].quickMessages).toEqual(quickMessages);
            });
        });

        describe('and quick messages do not exist', () => {
            it('then it should return an empty list', async () => {
                const fetchResult = await getAllLocationQuickMessages({locationId, tenantId: 2});
                expect(fetchResult).toEqual([]);
            });
        });
    });

    describe('When we are querying for system messages by id', () => {
        it('then it should return the quick messages', async () => {
            const result = await getLocationQuickMessageById(messageId, location2.tenantId);
            expect(result).toEqual(quickMessages);
        });
    });

    describe('When we are querying for system messages by correct id and incorrect tenant id', () => {
        it('then it should return null', async () => {
            const result = await getLocationQuickMessageById(messageId, '9999');
            expect(result).toEqual(null);
        });
    });

    describe('When we are querying for system messages by incorrect id and correct tenant id', () => {
        it('then it should return null', async () => {
            const result = await getLocationQuickMessageById('9999', location2.tenantId);
            expect(result).toEqual(null);
        });
    });

    describe('When we are updating a system message', () => {
        describe('and the message exists', () => {
            it('then it should return the updated quick messages', async () => {
                const updateResult = await updateLocationQuickMessage({
                    messageId,
                    quickMessages: quickMessagesUpdated,
                    tenantId: location2.tenantId
                });
                expect(updateResult.quickMessages).toEqual(quickMessagesUpdated);
            });
        });

        describe('and the message does not exist', () => {
            it('then it should throw', async () => {
                try {
                    await updateLocationQuickMessage({
                        messageId: 0,
                        quickMessages: quickMessagesUpdated,
                        tenantId: location2.tenantId
                    });
                } catch (error) {
                    expect(error).toBeInstanceOf(DBError);
                    expect(error.message).toBe('invalidMessage');
                }
            });
        });
    });

    describe('When we are deleting system messages', () => {
        it('then it should return true', async () => {
            const deleteResult = await deleteLocationQuickMessage({
                messageId,
                tenantId: location2.tenantId
            });
            expect(deleteResult).toEqual(true);
        });
    });

    describe('When we are updating the location quick messages order', () => {
        describe('and the list of ids received is the same as the one from the db', () => {
            it('then it should return quick messages', async () => {
                const updateResult = await updateLocationQuickMessagesOrder({
                    locationId,
                    quickMessagesIds: [`${messageId}`, `${messageId2}`],
                    tenantId: location2.tenantId
                });
                expect(updateResult[0].messageId).toEqual(messageId);
                expect(updateResult[1].messageId).toEqual(messageId2);
            });
        });

        describe('and the list of ids received is the different than one from the db', () => {
            it('then it should throw', async () => {
                try {
                    await updateLocationQuickMessagesOrder({
                        locationId,
                        quickMessagesIds: [`-1`, `${messageId2}`],
                        tenantId: location2.tenantId
                    });
                } catch (error) {
                    expect(error).toBeInstanceOf(DBError);
                    expect(error.message).toBe('invalidIds');
                }
            });
        });
    });

    describe('When we are creating a location quick messages and the limit was reached', () => {
        it('then it should throw', async () => {
            try {
                for (let i = 0; i < MAX_QUICK_MESSAGES; i++) {
                    await createLocationQuickMessage({
                        locationId,
                        quickMessages,
                        tenantId: location2.tenantId
                    });
                }
            } catch (error) {
                expect(error).toBeInstanceOf(UserInputError);
                expect(error.message).toBe('Number of quick messages exceeded');
            }
        });
    });

    describe('When we are creating a site wide quick messages and the limit was reached', () => {
        it('then it should throw', async () => {
            try {
                for (let i = 0; i < MAX_SITE_WIDE_QUICK_MESSAGES; i++) {
                    await createSiteWideQuickMessage({quickMessages, tenantId: location2.tenantId});
                }
            } catch (error) {
                expect(error).toBeInstanceOf(UserInputError);
                expect(error.message).toBe('Number of site wide quick messages exceeded');
            }
        });
    });
});

describe('When we are creating a location quick message for a location that does not exist', () => {
    it('then it should throw', async () => {
        try {
            await createLocationQuickMessage({
                locationId: -1,
                quickMessages,
                tenantId: location2.tenantId
            });
        } catch (error) {
            expect(error).toBeInstanceOf(UserInputError);
            expect(error.message).toEqual('Invalid location');
        }
    });
});
