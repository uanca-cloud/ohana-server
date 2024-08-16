const {getLocationList} = require('ohana-shared');

async function LocationsResolver(_parent, _args, {tenantId}) {
    return getLocationList(tenantId);
}

module.exports = LocationsResolver;
