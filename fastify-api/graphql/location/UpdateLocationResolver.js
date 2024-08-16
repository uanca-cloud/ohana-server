const {updateLocation} = require('ohana-shared');

async function UpdateLocationResolver(_parent, args, {tenantId}) {
    const {id, label} = args.location;
    return updateLocation({id, label: label.trim(), tenantId});
}

module.exports = UpdateLocationResolver;
