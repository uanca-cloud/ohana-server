const {getDatabasePool} = require('../DatabasePoolFactory'),
    {createLocationSettingTemplate} = require('../EntitiesFactory'),
    {DB_CONNECTION_POOLS} = require('../constants'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('LocationSettingsDao');

/**
 * @typedef {Object} locationSetting
 * @property {string} locationId
 * @property {string} key
 * @property {string} value
 * @property {string} tenantId
 */

/**
 *
 * @param locationSetting locationSetting
 * @returns {Promise<*>}
 */
async function updateLocationSetting(locationSetting) {
    logger.debug('Updating location setting...');
    const {locationId, key, value, tenantId} = locationSetting;
    const updateQuery = `
        UPDATE location_settings 
        SET value = $1 
        WHERE location_id = $2 
            AND key = $3 
            AND tenant_id = $4
            AND value <> $1;`;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const queryResult = await pool.query(updateQuery, [value, locationId, key, tenantId]);

    if (queryResult.rowCount === 0) {
        logger.debug('Value already exists');
        throw new Error('Value already exists');
    }

    return createLocationSettingTemplate({key, value});
}

/**
 *
 * @param locationSetting
 * @returns {Promise<{value: null, key: null}>}
 */
async function getLocationSettings(locationSetting) {
    const {tenantId, locationId} = locationSetting;
    const selectQuery = `
        SELECT key, value FROM location_settings WHERE location_id = $1 AND tenant_id = $2;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(selectQuery, [locationId, tenantId]);

    return results.rows.map((result) => {
        return createLocationSettingTemplate({
            key: result.key,
            value: result.value
        });
    });
}

/**
 *
 * @param locationSetting
 * @returns {Promise<{value: null, key: null}>}
 */
async function getLocationSetting(locationSetting) {
    logger.debug('Getting location setting...');
    const {tenantId, locationId, key} = locationSetting;
    const selectQuery = `
        SELECT key, value FROM location_settings WHERE location_id = $1 AND tenant_id = $2 AND key = $3;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQuery, [locationId, tenantId, key]);

    if (!result.rowCount) {
        logger.info({metadata: {locationId, tenantId}}, 'Location settings not found');
        return null;
    }

    return createLocationSettingTemplate({
        key: result.rows[0].key,
        value: result.rows[0].value
    });
}
module.exports = {updateLocationSetting, getLocationSettings, getLocationSetting};
