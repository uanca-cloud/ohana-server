const {getPatientsByUser, getLogger} = require('ohana-shared');

async function PatientsResolver(_parent, _args, context) {
    const {userId, tenantId} = context;
    const logger = getLogger('PatientsResolver', context);

    logger.debug(`Finding patients...`);
    try {
        return await getPatientsByUser({userId, tenantId});
    } catch (error) {
        logger.error({error}, 'Error occurred while finding patients!');
        throw error;
    }
}

module.exports = PatientsResolver;
