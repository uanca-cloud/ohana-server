const {createLocation, getLogger} = require('ohana-shared');

async function CreateLocationResolver(_parent, args, context) {
    const logger = getLogger('CreateLocationResolver', context);
    const {tenantId, version} = context;
    const {label} = args.location;

    logger.debug('Creating a new location');
    return createLocation({label: label.trim(), tenantId}, version);
}

module.exports = CreateLocationResolver;
