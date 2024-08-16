const {getDatabasePool} = require('../DatabasePoolFactory'),
    {createTenantSettingTemplate} = require('../EntitiesFactory'),
    {runWithTransaction} = require('../DaoHelper'),
    {DB_CONNECTION_POOLS} = require('../constants'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('TenantSettingsDao');

/**
 * @typedef {Object} tenantSetting
 * @property {string} tenantId
 * @property {string} key
 * @property {string} value
 */

/**
 *
 * @param tenantSetting tenantSettings
 * @returns {Promise<*>}
 */
async function updateTenantSetting(tenantSetting) {
    const {tenantId, key, value} = tenantSetting;
    const updateQuery = `UPDATE tenant_settings SET value = $1 WHERE tenant_id = $2 AND key = $3;`;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return pool.query(updateQuery, [value, tenantId, key]);
}

/**
 *
 * @param tenantSetting
 * @returns {Promise<{value: null, key: null}>}
 */
async function getTenantSetting(tenantSetting) {
    logger.debug('Getting tenant settings...');

    const {key, tenantId} = tenantSetting;
    const selectQuery = `SELECT key, value FROM tenant_settings WHERE tenant_id = $1 and key = $2;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQuery, [tenantId, key]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, tenantSetting: key}}, 'No tenant settings found');
        return null;
    }

    return createTenantSettingTemplate({
        key: result.rows[0].key,
        value: result.rows[0].value
    });
}

/**
 *
 * @param key
 * @returns [{Promise<{value: null, key: null}>}]
 */
async function getKeySettings(key) {
    const selectQuery = `SELECT tenant_id, value FROM tenant_settings WHERE key = $1;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(selectQuery, [key]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantSetting: key}}, 'No tenant settings found');
        return null;
    }

    return result.rows.map((element) =>
        createTenantSettingTemplate({
            tenantId: element.tenant_id,
            value: element.value
        })
    );
}

async function insertDefaultTenantSettings(tenantSettings) {
    const updateQuery = `
        INSERT INTO tenant_settings (tenant_id, key, value) values ($1, $2, $3)
        ON CONFLICT(tenant_id, key) 
        DO NOTHING;
    `;

    return runWithTransaction(async (pool) => {
        for (let i = 0; i < tenantSettings.length; i++) {
            const {tenantId, key, value} = tenantSettings[i];
            await pool.query(updateQuery, [tenantId, key, value]);
        }
    });
}

async function getTenantSettings(tenantSetting) {
    logger.debug('Getting tenant setting by tenant id...');
    const {tenantId} = tenantSetting;
    const selectQuery = `SELECT key, value FROM tenant_settings WHERE tenant_id = $1;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await pool.query(selectQuery, [tenantId]);

    if (!results.rowCount) {
        logger.info({metadata: {tenantId}}, 'No tenant settings found');
        return [];
    }

    return results.rows.map((result) =>
        createTenantSettingTemplate({
            key: result.key,
            value: result.value
        })
    );
}

module.exports = {
    updateTenantSetting,
    getTenantSetting,
    insertDefaultTenantSettings,
    getTenantSettings,
    getKeySettings
};
