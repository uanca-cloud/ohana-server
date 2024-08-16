const {
        locationsFixtures: {location1, location3}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        locationFixedContentFixtures: {locationFixedContent1}
    } = require('../test/fixtures/FixedContentFixtures');

let pool = null,
    locationId = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestLocation = null,
    getTestLocationById = null,
    insertTestLocationFixedContent = null,
    getTestLocationFixedContentByLocationId = null,
    getLocationList = null,
    createLocation = null,
    deleteLocation = null,
    updateLocation = null,
    getLocationById = null;

beforeEach(async () => {
    locationId = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    getTestLocationById = require('../test/fixtures/LocationsFixtures').getTestLocationById;
    insertTestLocationFixedContent =
        require('../test/fixtures/FixedContentFixtures').insertTestLocationFixedContent;
    getTestLocationFixedContentByLocationId =
        require('../test/fixtures/FixedContentFixtures').getTestLocationFixedContentByLocationId;
    getLocationList = require('./LocationDao').getLocationList;
    createLocation = require('./LocationDao').createLocation;
    deleteLocation = require('./LocationDao').deleteLocation;
    updateLocation = require('./LocationDao').updateLocation;
    getLocationById = require('./LocationDao').getLocationById;

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
        'location_fixed_contents'
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
        'location_fixed_contents'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for locations', () => {
    beforeEach(async () => {
        const locationInsert = await insertTestLocation(pool, location1);
        locationId = locationInsert.rows[0].id;
    });

    it('then all locations should be returned', async () => {
        const result = await getLocationList(location1.tenantId);

        expect(result[0].id).toBe(locationId);
        expect(result[0].label).toBe(location1.label);
    });

    describe('and we use a wrong location id', () => {
        it('should return null', async () => {
            const result = await getLocationById(-1);

            expect(result).toBe(null);
        });
    });

    describe('and location list is empty', () => {
        it('then empty array should be returned', async () => {
            await deleteLocation({id: locationId, tenantId: location1.tenantId});
            const result = await getLocationList(location1.tenantId);

            expect(result).toEqual([]);
        });
    });

    describe('and we want add an already existing new location', () => {
        it('then a duplicate location error should be thrown', async () => {
            try {
                await createLocation(location1);
            } catch (err) {
                expect(err.message).toBe(`duplicateLocation`);
            }
        });
    });

    describe('and we want add a location with an undefined label', () => {
        it('then an error should be thrown', async () => {
            try {
                await createLocation({label: undefined, tenantId: location1.tenantId});
            } catch (err) {
                expect(err.message).toBe(
                    `null value in column "label" violates not-null constraint`
                );
            }
        });
    });

    describe('and we want update a location', () => {
        it('then the updated location should be returned', async () => {
            await updateLocation({
                id: locationId,
                label: 'new location',
                tenantId: location1.tenantId
            });
            const location = await getTestLocationById(pool, locationId);

            expect(location.rows[0].label).toBe('new location');
        });
    });

    describe('and we want delete a location', () => {
        it('then the given location should be deleted', async () => {
            const location = await deleteLocation({id: locationId, tenantId: location1.tenantId});
            const result = await getTestLocationById(pool, location.id);

            expect(result.rowCount).toBe(0);
        });
        describe('and we want delete a location and all associated location fixed content', () => {
            beforeEach(async () => {
                const locationFixedContentData = {
                    locationId: locationId,
                    fixedContent: locationFixedContent1,
                    tenantId: location1.tenantId
                };

                await insertTestLocation(pool, location3);
                await insertTestLocationFixedContent(pool, locationFixedContentData);
            });
            it('then the given location and the associated fixed content should be deleted', async () => {
                const location = await deleteLocation({
                    id: locationId,
                    tenantId: location1.tenantId
                });

                const LocResult = await getTestLocationById(pool, location.id);
                const LocFixedContentResult = await getTestLocationFixedContentByLocationId(
                    pool,
                    location.id
                );

                expect(LocResult.rowCount).toBe(0);
                expect(LocFixedContentResult.rowCount).toBe(0);
            });
        });
    });

    describe('and we want update a location with a duplicate location name', () => {
        it('then it should throw duplicate error', async () => {
            try {
                await updateLocation({
                    id: locationId,
                    label: location1.label,
                    tenantId: location1.tenantId
                });
            } catch (err) {
                expect(err.message).toBe(`duplicateLocation`);
            }
        });
    });
});
