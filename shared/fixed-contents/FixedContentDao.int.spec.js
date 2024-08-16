let pool = null,
    locationId = null,
    fixedContentId1 = null,
    fixedContentId2 = null,
    fixedContentId3 = null,
    fixedContents = [
        {title: 'Google', url: 'https://www.google.com', color: 'red'},
        {title: 'Yahoo', url: 'https://www.yahoo.com', color: 'blue'}
    ],
    fixedContentsUpdated = [
        {title: 'Gogole', url: 'https://www.google.com', color: 'red'},
        {title: 'AOL', url: 'https://www.aol.com', color: 'blue'}
    ],
    fixedContentOrder1 = null,
    fixedContentOrder2 = null,
    fixedContentOrder3 = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestLocation = null,
    createLocationFixedContent = null,
    createSiteWideFixedContent = null,
    getLocationFixedContents = null,
    getAllLocationFixedContents = null,
    updateLocationFixedContent = null,
    updateLocationFixedContentsOrder = null,
    deleteLocationFixedContent = null,
    DBError = null,
    UserInputError = null,
    location2 = null,
    MAX_FIXED_CONTENTS = null;

beforeEach(async () => {
    locationId = null;
    fixedContentId1 = null;
    fixedContentId2 = null;
    fixedContentId3 = null;
    fixedContentOrder1 = null;
    fixedContentOrder2 = null;
    fixedContentOrder3 = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    createLocationFixedContent = require('./FixedContentDao').createLocationFixedContent;
    createSiteWideFixedContent = require('./FixedContentDao').createSiteWideFixedContent;
    getLocationFixedContents = require('./FixedContentDao').getLocationFixedContents;
    getAllLocationFixedContents = require('./FixedContentDao').getAllLocationFixedContents;
    updateLocationFixedContent = require('./FixedContentDao').updateLocationFixedContent;
    updateLocationFixedContentsOrder =
        require('./FixedContentDao').updateLocationFixedContentsOrder;
    deleteLocationFixedContent = require('./FixedContentDao').deleteLocationFixedContent;
    DBError = require('../custom-errors').DBError;
    UserInputError = require('../custom-errors').UserInputError;
    location2 = require('../test/fixtures/LocationsFixtures').locationsFixtures.location2;
    MAX_FIXED_CONTENTS = require('.././constants').MAX_FIXED_CONTENTS;

    pool = bootstrapTest();

    await truncateTables(pool, [
        'location_fixed_contents',
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
        'location_fixed_contents',
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

afterAll(async () => {});

describe('Given we want to query the database for location fixed contents', () => {
    beforeEach(async () => {
        const {
            createLocationFixedContent,
            createSiteWideFixedContent
        } = require('./FixedContentDao');

        const locationResult = await insertTestLocation(pool, location2);
        locationId = locationResult.rows[0].id;
        const createResult1 = await createLocationFixedContent({
            locationId,
            fixedContent: fixedContents[0],
            tenantId: location2.tenantId
        });
        const createResult2 = await createLocationFixedContent({
            locationId,
            fixedContent: fixedContents[1],
            tenantId: location2.tenantId
        });
        const createResult3 = await createSiteWideFixedContent({
            fixedContent: fixedContents[1],
            tenantId: location2.tenantId
        });
        fixedContentId1 = createResult1.id;
        fixedContentId2 = createResult2.id;
        fixedContentId3 = createResult3.id;
        // When adding fixed contents, they are added at the beginning,
        // meaning the order of existing fixed contents increases by 1
        fixedContentOrder1 = createResult1.order;
        fixedContentOrder2 = createResult2.order;
        fixedContentOrder3 = createResult3.order;
    });

    describe('When we are querying for location fixed contents', () => {
        it('We should get the correct number of fixed contents', async () => {
            const result = await getLocationFixedContents({
                locationId,
                tenantId: location2.tenantId
            });
            expect(result[0].id).toEqual(fixedContentId2);
            expect(result[1].id).toEqual(fixedContentId1);
        });

        it('We should get the correct order of fixed contents', async () => {
            const result = await getLocationFixedContents({
                locationId,
                tenantId: location2.tenantId
            });

            expect(result[0].order).toEqual(fixedContentOrder2);
            expect(result[1].order).toEqual(fixedContentOrder1 + 1);
        });
    });

    describe('When we are querying for fixed contents by location and site wide', () => {
        it('We should get the correct number of fixed contents', async () => {
            const result = await getAllLocationFixedContents({
                locationId,
                tenantId: location2.tenantId
            });

            expect(result[0].id).toEqual(fixedContentId2);
            expect(result[1].id).toEqual(fixedContentId1);
            expect(result[2].id).toEqual(fixedContentId3);
        });

        it('We should get the correct order of fixed contents', async () => {
            const result = await getAllLocationFixedContents({
                locationId,
                tenantId: location2.tenantId
            });

            expect(result[0].order).toEqual(fixedContentOrder2);
            expect(result[1].order).toEqual(fixedContentOrder1 + 1);
            expect(result[2].order).toEqual(fixedContentOrder3);
        });
    });

    describe('When we are querying for site wide fixed contents', () => {
        it('We should get the correct number of fixed contents', async () => {
            const result = await getLocationFixedContents({tenantId: location2.tenantId});

            expect(result[0].id).toEqual(fixedContentId3);
        });
    });

    describe('When we are querying for location fixed contents with an invalid location id', () => {
        it('We should get an empty array', async () => {
            const result = await getLocationFixedContents({
                locationId: -1,
                tenantId: location2.tenantId
            });

            expect(result).toEqual([]);
        });
    });

    describe('When we are querying for fixed contents by location and site wide with an invalid tenant id', () => {
        it('We should get an empty array', async () => {
            const result = await getAllLocationFixedContents({locationId, tenantId: -1});

            expect(result).toEqual([]);
        });
    });

    describe('When we are querying for location fixed contents with an invalid tenant id', () => {
        it('We should get an empty array', async () => {
            const result = await getLocationFixedContents({locationId, tenantId: -1});

            expect(result).toEqual([]);
        });
    });

    describe('When we are querying for site wide fixed contents with an invalid tenant id', () => {
        it('We should get an empty array', async () => {
            const result = await getLocationFixedContents({tenantId: -1});

            expect(result).toEqual([]);
        });
    });

    describe('When we are querying for location fixed contents with an invalid location id and tenant id', () => {
        it('We should get an empty array', async () => {
            const result = await getLocationFixedContents({locationId: -1, tenantId: -1});

            expect(result).toEqual([]);
        });
    });

    describe('When we are updating a location fixed content', () => {
        it('We should get the updated version back', async () => {
            const result = await updateLocationFixedContent({
                id: fixedContentId1,
                fixedContent: fixedContentsUpdated[0],
                tenantId: location2.tenantId
            });

            expect(result.id).toEqual(fixedContentId1);
            expect(result.title).toEqual(fixedContentsUpdated[0].title);
            expect(result.url).toEqual(fixedContentsUpdated[0].url);
        });
    });

    describe('When we are updating a location fixed content with an invalid id', () => {
        it('We should get an Error thrown', () => {
            updateLocationFixedContent({
                id: -1,
                fixedContent: fixedContentsUpdated[0],
                tenantId: location2.tenantId
            }).catch((error) => {
                expect(error).toBeInstanceOf(DBError);
                expect(error.extensions.description).toEqual(
                    'Incorrect fixed Content ID or tenant ID'
                );
            });
        });
    });

    describe('When we are deleting a location fixed content', () => {
        it('We should get a truthfully boolean back if the fixed content exists', async () => {
            const result = await deleteLocationFixedContent({
                fixedContentId: fixedContentId1,
                tenantId: location2.tenantId
            });

            expect(result).toEqual(true);
        });

        it('We should get a false boolean back if the fixed content does not exist', async () => {
            await deleteLocationFixedContent({
                fixedContentId: -1,
                tenantId: location2.tenantId
            }).catch((error) => {
                expect(error).toBeInstanceOf(DBError);
                expect(error.extensions.description).toEqual(
                    'Incorrect fixed Content ID or tenant ID'
                );
            });
        });
    });

    describe('When we are updating the order of a location fixed content', () => {
        it('We should get the updated version back', async () => {
            const result = await updateLocationFixedContentsOrder({
                locationId,
                tenantId: location2.tenantId,
                fixedContentsIds: [`${fixedContentId2}`, `${fixedContentId1}`]
            });

            expect(result[0].id).toEqual(fixedContentId2);
            expect(result[0].order).toEqual(1);
            expect(result[1].id).toEqual(fixedContentId1);
            expect(result[1].order).toEqual(2);
        });

        it('We should get an Error thrown if the ids mismatch', async () => {
            await updateLocationFixedContentsOrder({
                locationId,
                tenantId: location2.tenantId,
                fixedContentsIds: [`${fixedContentId2}`, `${fixedContentId1}`, -1]
            }).catch((error) => {
                expect(error).toBeInstanceOf(DBError);
                expect(error.extensions.description).toEqual('Fixed content ids mismatch');
            });

            await updateLocationFixedContentsOrder({
                locationId,
                tenantId: location2.tenantId,
                fixedContentsIds: [`${fixedContentId2}`, `${fixedContentId1}`, `${fixedContentId1}`]
            }).catch((error) => {
                expect(error).toBeInstanceOf(DBError);
                expect(error.extensions.description).toEqual('Fixed content ids mismatch');
            });

            await updateLocationFixedContentsOrder({
                locationId,
                tenantId: location2.tenantId,
                fixedContentsIds: [`${fixedContentId2}`]
            }).catch((error) => {
                expect(error).toBeInstanceOf(DBError);
                expect(error.extensions.description).toEqual('Fixed content ids mismatch');
            });
        });
    });

    describe('When we are creating more fixed content than it is allowed', () => {
        it('We should get an Error thrown', async () => {
            try {
                for (let i = 0; i < MAX_FIXED_CONTENTS; i++) {
                    await createLocationFixedContent({
                        locationId,
                        fixedContent: fixedContents[0],
                        tenantId: location2.tenantId
                    });
                }
            } catch (error) {
                expect(error).toBeInstanceOf(UserInputError);
                expect(error.message).toBe('Maximum number of fixed contents reached');
            }
        });
    });

    describe('When we are creating more site wide content than it is allowed', () => {
        it('We should get an Error thrown', async () => {
            try {
                for (let i = 0; i < MAX_FIXED_CONTENTS; i++) {
                    await createSiteWideFixedContent({
                        fixedContent: fixedContents[0],
                        tenantId: location2.tenantId
                    });
                }
            } catch (error) {
                expect(error).toBeInstanceOf(UserInputError);
                expect(error.message).toBe('Maximum number of site wide fixed contents reached');
            }
        });
    });

    describe('When we are creating fixed content for a location that does not exist', () => {
        it('We should get an Error thrown', async () => {
            try {
                await createLocationFixedContent({
                    locationId: -1,
                    fixedContent: fixedContents[0],
                    tenantId: location2.tenantId
                });
            } catch (error) {
                expect(error).toBeInstanceOf(UserInputError);
                expect(error.message).toBe('Invalid location');
            }
        });
    });

    describe('When we are creating fixed content with an invalid value for a location', () => {
        it('We should get an Error thrown', async () => {
            try {
                await createLocationFixedContent({
                    locationId,
                    fixedContent: {title: 123, url: 'https://www.google.com', color: 'red'},
                    tenantId: location2.tenantId
                });
            } catch (error) {
                expect(error).toBeInstanceOf(DBError);
                expect(error.message).toBe(
                    'Something went wrong when creating a new fixed content'
                );
            }
        });
    });

    describe('When we are creating site wide fixed content with an invalid value', () => {
        it('We should get an Error thrown', async () => {
            try {
                await createSiteWideFixedContent({
                    fixedContent: {title: 123, url: 'https://www.google.com', color: 'red'},
                    tenantId: location2.tenantId
                });
            } catch (error) {
                expect(error).toBeInstanceOf(DBError);
                expect(error.message).toBe(
                    'Something went wrong when creating a new fixed content'
                );
            }
        });
    });
});
