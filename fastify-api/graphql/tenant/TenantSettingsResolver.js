const {getTenantSettings} = require('ohana-shared');

async function TenantSettingsResolver(_parent, _args, {tenantId}) {
    return getTenantSettings({tenantId});
}

module.exports = TenantSettingsResolver;
