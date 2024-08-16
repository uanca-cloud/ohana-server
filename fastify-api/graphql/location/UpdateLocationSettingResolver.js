const {
    updateLocationSetting,
    CONSTANTS: {
        LOCATION_SETTINGS_KEYS: {CHAT_LOCATION_ENABLED}
    },
    publishLocationChatToggle
} = require('ohana-shared');

async function UpdateLocationSettingResolver(_parent, args, {tenantId}) {
    const {locationId, key, value} = args.input;

    try {
        const updateResult = await updateLocationSetting({locationId, key, value, tenantId});

        if (key === CHAT_LOCATION_ENABLED) {
            publishLocationChatToggle(locationId, value);
        }

        return updateResult;
    } catch (e) {
        return {key, value};
    }
}

module.exports = UpdateLocationSettingResolver;
