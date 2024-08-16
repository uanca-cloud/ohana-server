const {deleteLocation} = require('ohana-shared');

async function RemoveLocationResolver(_parent, args, {tenantId}) {
    const {id} = args;

    return deleteLocation({id, tenantId});
}

module.exports = RemoveLocationResolver;
