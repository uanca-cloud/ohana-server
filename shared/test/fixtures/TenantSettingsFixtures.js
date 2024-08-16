const {
    TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE, AUDIT_RETENTION}
} = require('../../constants');

const tenantSettingsFixtures = {
    tenantSettings1: {
        tenantId: '1',
        key: EXTERNAL_ID_TYPE,
        value: 'MRN'
    },
    tenantSettings2: {
        tenantId: '2',
        key: AUDIT_RETENTION,
        value: '2'
    },
    tenantSettings3: {
        tenantId: '3',
        key: AUDIT_RETENTION,
        value: '1'
    }
};

function insertTestTenantSetting(database, tenantSettings) {
    const {tenantId, key, value} = tenantSettings;
    return database.query(
        `INSERT INTO tenant_settings (tenant_id, key, value) values ($1, $2, $3);`,
        [tenantId, key, value]
    );
}

function selectTestTenantSetting(database, tenantSettings) {
    const {tenantId, key} = tenantSettings;
    return database.query(
        `SELECT value, key, tenant_id FROM tenant_settings WHERE tenant_id = $1 AND key = $2;`,
        [tenantId, key]
    );
}

module.exports = {tenantSettingsFixtures, insertTestTenantSetting, selectTestTenantSetting};
