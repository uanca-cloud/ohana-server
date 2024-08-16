const {updateTenantSetting, createTenantSettingTemplate} = require('ohana-shared');

async function UpdateTenantSettingResolver(_parent, args, {tenantId}) {
    const {key, value} = args.input;
    await updateTenantSetting({key, value, tenantId});

    return createTenantSettingTemplate({key, value});
}

module.exports = UpdateTenantSettingResolver;
