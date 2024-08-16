const {
        LOCATION_SETTINGS_KEYS: {
            PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
            ALLOW_SECONDARY_FAMILY_MEMBERS,
            CHAT_LOCATION_ENABLED
        },
        PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT,
        ALLOW_SECONDARY_FAMILY_MEMBERS_DEFAULT,
        CHAT_LOCATION_ENABLED_DEFAULT
    } = require('../constants'),
    {
        locationsFixtures: {location1, location2}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        locationSettingsFixtures: {locationSettings1}
    } = require('../test/fixtures/LocationSettingsFixtures');

let pool = null,
    locationId = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestLocation = null,
    insertTestLocationSetting = null,
    selectTestLocationSetting = null;

beforeEach(async () => {
    locationId = null;

    jest.mock('../pubsub/ChatUpdatePublisher');

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    insertTestLocationSetting =
        require('../test/fixtures/LocationSettingsFixtures').insertTestLocationSetting;
    selectTestLocationSetting =
        require('../test/fixtures/LocationSettingsFixtures').selectTestLocationSetting;

    pool = bootstrapTest();

    await truncateTables(pool, ['locations', 'location_settings', 'location_quick_messages']);
});

afterEach(async () => {
    jest.unmock('../pubsub/ChatUpdatePublisher');
    await truncateTables(pool, ['locations', 'location_settings', 'location_quick_messages']);
    await pool.drain().then(() => pool.clear());
});

afterAll(async () => {
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for tenant settings', () => {
    beforeEach(async () => {
        const locationInsert = await insertTestLocation(pool, location1);
        locationId = locationInsert.rows[0].id;
    });

    describe('when getting the settings of a location', () => {
        it('then all values should be returned', async () => {
            const {getLocationSettings} = require('./LocationSettingsDao');

            await insertTestLocationSetting(pool, {
                locationId,
                tenantId: location1.tenantId,
                key: locationSettings1.key,
                value: locationSettings1.value
            });
            const result = await getLocationSettings({tenantId: location1.tenantId, locationId});

            expect(result[0].key).toBe(locationSettings1.key);
            expect(parseInt(result[0].value)).toBe(locationSettings1.value);
        });
    });

    describe('when updating a setting of a location', () => {
        it('then the new value should be returned', async () => {
            const {updateLocationSetting} = require('./LocationSettingsDao');

            await insertTestLocationSetting(pool, {
                locationId,
                tenantId: location1.tenantId,
                key: locationSettings1.key,
                value: locationSettings1.value
            });
            await updateLocationSetting({
                locationId,
                tenantId: location1.tenantId,
                value: 30,
                key: locationSettings1.key
            });
            const result = await selectTestLocationSetting(pool, {
                tenantId: location1.tenantId,
                locationId
            });

            expect(parseInt(result.rows[0].value)).toBe(30);
        });
    });

    describe('when updating a location settings of a different tenant', () => {
        it('then nothing should happen', async () => {
            const {updateLocationSetting} = require('./LocationSettingsDao');

            await insertTestLocationSetting(pool, {
                locationId,
                tenantId: location1.tenantId,
                key: locationSettings1.key,
                value: locationSettings1.value
            });
            try {
                await updateLocationSetting({
                    locationId,
                    tenantId: '99',
                    value: 30,
                    key: locationSettings1.key
                });
            } catch (error) {
                const result = await selectTestLocationSetting(pool, {
                    tenantId: location1.tenantId,
                    locationId
                });

                expect(parseInt(result.rows[0].value)).toBe(locationSettings1.value);
            }
        });
    });

    describe('when a new location is created', () => {
        it('then a location setting should be created by default', async () => {
            const {createLocation} = require('../location/LocationDao');

            const location = await createLocation(location2);
            const result = await selectTestLocationSetting(pool, {
                tenantId: location1.tenantId,
                locationId: location.id
            });

            const patientUnenrollmentInHours = result.rows.filter(
                (setting) => setting.key === PATIENT_AUTO_UNENROLLMENT_IN_HOURS
            );
            const allowSecondaryFamilyMembers = result.rows.filter(
                (setting) => setting.key === ALLOW_SECONDARY_FAMILY_MEMBERS
            );
            const chatLocationEnabled = result.rows.filter(
                (setting) => setting.key === CHAT_LOCATION_ENABLED
            );
            expect(parseInt(patientUnenrollmentInHours[0]?.value)).toBe(
                PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT
            );
            expect(patientUnenrollmentInHours[0]?.key).toBe(PATIENT_AUTO_UNENROLLMENT_IN_HOURS);

            expect(allowSecondaryFamilyMembers[0]?.value).toBe(
                ALLOW_SECONDARY_FAMILY_MEMBERS_DEFAULT
            );
            expect(allowSecondaryFamilyMembers[0]?.key).toBe(ALLOW_SECONDARY_FAMILY_MEMBERS);

            expect(chatLocationEnabled[0]?.value).toBe(CHAT_LOCATION_ENABLED_DEFAULT);
            expect(chatLocationEnabled[0]?.key).toBe(CHAT_LOCATION_ENABLED);
        });
    });

    describe('when a location is deleted', () => {
        it('then the location setting should also be deleted', async () => {
            const {createLocation, deleteLocation} = require('../location/LocationDao');

            const location = await createLocation(location2);
            await deleteLocation({id: location.id, tenantId: location2.tenantId});
            const result = await selectTestLocationSetting(pool, {
                tenantId: location1.tenantId,
                locationId: location.id
            });

            expect(result.rowCount).toBe(0);
        });
    });

    describe('when getting a specific setting of a location', () => {
        it('then one value should be returned', async () => {
            const {getLocationSettings} = require('./LocationSettingsDao');

            await insertTestLocationSetting(pool, {
                locationId,
                tenantId: location1.tenantId,
                key: locationSettings1.key,
                value: locationSettings1.value
            });
            const result = await getLocationSettings({
                tenantId: location1.tenantId,
                locationId,
                key: locationSettings1.key
            });

            expect(result[0].key).toBe(locationSettings1.key);
            expect(parseInt(result[0].value)).toBe(locationSettings1.value);
        });
    });

    describe('when getting a setting for a location', () => {
        describe('and the setting exists', () => {
            it('then one value should be returned', async () => {
                const {getLocationSetting} = require('./LocationSettingsDao');

                await insertTestLocationSetting(pool, {
                    locationId,
                    tenantId: location1.tenantId,
                    key: locationSettings1.key,
                    value: locationSettings1.value
                });
                const result = await getLocationSetting({
                    tenantId: location1.tenantId,
                    locationId,
                    key: locationSettings1.key
                });

                expect(result.key).toBe(locationSettings1.key);
                expect(parseInt(result.value)).toBe(locationSettings1.value);
            });
        });

        describe('and the setting does not exist', () => {
            it('then null should be returned', async () => {
                const {getLocationSetting} = require('./LocationSettingsDao');

                await insertTestLocationSetting(pool, {
                    locationId,
                    tenantId: location1.tenantId,
                    key: locationSettings1.key,
                    value: locationSettings1.value
                });
                const result = await getLocationSetting({
                    tenantId: '12345',
                    locationId: '1234567',
                    key: 'test'
                });

                expect(result).toBe(null);
            });
        });
    });
});
