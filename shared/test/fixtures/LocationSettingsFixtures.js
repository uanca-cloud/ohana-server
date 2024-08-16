const {
    LOCATION_SETTINGS_KEYS: {PATIENT_AUTO_UNENROLLMENT_IN_HOURS},
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT
} = require('../../constants');

const locationSettingsFixtures = {
    locationSettings1: {
        key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
        value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT
    }
};

function insertTestLocationSetting(database, LocationSettings) {
    const {locationId, tenantId, key, value} = LocationSettings;
    return database.query(
        `INSERT INTO location_settings (location_id, key, value, tenant_id) VALUES ($1, $2, $3, $4);`,
        [locationId, key, value, tenantId]
    );
}

function selectTestLocationSetting(database, tenantSettings) {
    const {tenantId, locationId} = tenantSettings;
    return database.query(
        `SELECT value, key, tenant_id, location_id FROM location_settings WHERE location_id = $1 AND tenant_id = $2;`,
        [locationId, tenantId]
    );
}

module.exports = {locationSettingsFixtures, insertTestLocationSetting, selectTestLocationSetting};
