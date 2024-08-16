const {getLocationSettings} = require('ohana-shared');

async function LocationSettingsResolver(_parent, args, {tenantId}) {
    const {locationId} = args;
    return getLocationSettings({locationId, tenantId});
}

module.exports = LocationSettingsResolver;
