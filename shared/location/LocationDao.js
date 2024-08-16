const {getDatabasePool} = require('../DatabasePoolFactory'),
    {createLocationTemplate} = require('../EntitiesFactory'),
    {runWithTransaction} = require('../DaoHelper'),
    {
        ALLOW_SECONDARY_FAMILY_MEMBERS_DEFAULT,
        CHAT_LOCATION_ENABLED_DEFAULT,
        DB_CONNECTION_POOLS,
        LOCATION_SETTINGS_KEYS: {
            PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
            ALLOW_SECONDARY_FAMILY_MEMBERS,
            CHAT_LOCATION_ENABLED
        },
        PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT
    } = require('../constants'),
    DBError = require('../custom-errors/db-error'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('LocationDao');

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} label
 * @property {string} tenantId
 */

/**
 *
 * @param tenantId number
 * @returns {Promise<[]|[{id: String,label: String}]>}
 */
async function getLocationList(tenantId) {
    logger.debug('Getting location list by tenant id...');
    const queryText = `SELECT id,label FROM locations WHERE tenant_id = $1 ORDER BY label ASC;`;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [tenantId]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId}}, 'No location found');
        return [];
    }

    return result.rows.map((location) =>
        createLocationTemplate({
            id: location.id,
            label: location.label
        })
    );
}

async function getLocationById(locationId) {
    logger.debug('Getting location by id...');
    const queryText = `SELECT id,label FROM locations WHERE id = $1 ORDER BY label ASC;`;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [locationId]);

    if (!result.rowCount) {
        logger.info({metadata: {locationId}}, 'No location found');
        return null;
    }

    return createLocationTemplate({
        id: result.rows[0].id,
        label: result.rows[0].label
    });
}

/**
 *
 * @param location Location
 * @returns {Promise<null|{id: String,label: String}>}
 */
async function createLocation(location) {
    logger.debug('Creating location...');
    const {label, tenantId} = location;
    const insertLocation = `
        INSERT INTO locations (label, tenant_id)
        VALUES ($1, $2)
        RETURNING id;
    `;
    const insertLocationSetting = `
        INSERT INTO location_settings (location_id, key, value, tenant_id) 
        VALUES ($1, $2, $3, $4);
    `;
    let locationResult = null;

    try {
        await runWithTransaction(async (dbClient) => {
            locationResult = await dbClient.query(insertLocation, [label, tenantId]);
            await dbClient.query(insertLocationSetting, [
                locationResult.rows[0].id,
                PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT,
                tenantId
            ]);
            await dbClient.query(insertLocationSetting, [
                locationResult.rows[0].id,
                ALLOW_SECONDARY_FAMILY_MEMBERS,
                ALLOW_SECONDARY_FAMILY_MEMBERS_DEFAULT,
                tenantId
            ]);
            await dbClient.query(insertLocationSetting, [
                locationResult.rows[0].id,
                CHAT_LOCATION_ENABLED,
                CHAT_LOCATION_ENABLED_DEFAULT,
                tenantId
            ]);
        });
    } catch (error) {
        logger.error({error}, 'Error occurred when creating a location!');
        if (error.message.includes('duplicate')) {
            throw new DBError({
                message: 'duplicateLocation',
                description: 'Location name already exists'
            });
        }

        throw error;
    }

    return createLocationTemplate({
        id: locationResult.rows[0].id,
        label: location.label
    });
}

/**
 *
 * @param location Location
 * @returns {Promise<null|{id: String,label: String}>}
 */
async function updateLocation(location) {
    logger.debug('Updating location...');
    const updateLocationQuery = `UPDATE locations SET label = $1 where id = $2 and tenant_id = $3;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    try {
        const result = await pool.query(updateLocationQuery, [
            location.label,
            location.id,
            location.tenantId
        ]);
        return result.rowCount
            ? createLocationTemplate({id: location.id, label: location.label})
            : null;
    } catch (error) {
        logger.error({error}, 'Error occurred when updating a location');
        if (error.message.includes('duplicate')) {
            throw new DBError({
                message: 'duplicateLocation',
                description: 'Location name already exists'
            });
        }

        throw error;
    }
}

/**
 *
 * @param location Location
 * @returns Boolean
 */
async function deleteLocation(location) {
    logger.debug('Removing location...');
    const {id, tenantId} = location;
    const deleteLocationQuery = `DELETE FROM locations WHERE id = $1 and tenant_id = $2;`;
    const deleteLocationSystemMessages = `DELETE from location_quick_messages WHERE location_id = $1 and tenant_id = $2;`;
    const deleteLocationSetting = `DELETE from location_settings WHERE location_id = $1 and tenant_id = $2;`;
    const locationFixedContentsQuery = `DELETE FROM location_fixed_contents WHERE location_id = $1 and tenant_id = $2;`;

    await runWithTransaction(async (dbClient) => {
        await dbClient.query(deleteLocationSetting, [id, tenantId]);
        await dbClient.query(deleteLocationSystemMessages, [id, tenantId]);
        await dbClient.query(deleteLocationQuery, [id, tenantId]);
        await dbClient.query(locationFixedContentsQuery, [id, tenantId]);
    });

    return true;
}

module.exports = {getLocationList, createLocation, updateLocation, deleteLocation, getLocationById};
