const {
    TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE},
    EXTERNAL_ID_TYPES
} = require('./constants');
const {getTenantSetting} = require('./tenant/TenantSettingsDao');

function formatCDRHashId(tenantId, externalId, externalIdType) {
    return [tenantId, externalId, externalIdType].join('_');
}

function convertExternalIdTypeNameToId(externalIdTypeName) {
    const externalId = EXTERNAL_ID_TYPES.find((type) => type.value.includes(externalIdTypeName));

    return externalId?.key;
}

async function checkExternalIdTypeOnTenant(externalIdTypeName, tenantId) {
    const externalIdTypeSent = convertExternalIdTypeNameToId(externalIdTypeName);

    const setting = await getTenantSetting({tenantId, key: EXTERNAL_ID_TYPE});
    const externalIdTypeTenant = setting ? setting.value : null;

    return externalIdTypeSent === externalIdTypeTenant;
}

module.exports = {
    formatCDRHashId,
    convertExternalIdTypeNameToId,
    checkExternalIdTypeOnTenant
};
