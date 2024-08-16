const {ValidationError} = require('./custom-errors'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('UpdatesService');

function validateUpdate(update, encounterId, userId) {
    logger.debug('Validating update...');
    const hasUpdate = !!update;
    const hasEncounterId = hasUpdate && update.encounterId === encounterId;
    const hasUserId = hasUpdate && update.userId === userId;

    if (!hasUpdate || !hasEncounterId || !hasUserId) {
        logger.error({metadata: {encounterId, userId}}, 'Invalid encounter id or user id');
        throw new ValidationError({description: 'Invalid encounter id or user id'});
    }
}

module.exports = {validateUpdate};
