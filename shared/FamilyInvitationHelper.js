const {v4: uuid} = require('uuid');
const {setRedisCollectionData} = require('./RedisGateway');
const {
    REDIS_COLLECTIONS: {FAMILY_INVITES},
    FAMILY_INVITES_COLLECTION_TTL_IN_SECS,
    DISABLE_BRANCHIO_INTEGRATION
} = require('./constants');
const {getLogger} = require('./logs/LoggingService');
const {generateBranchIoUrl} = require('./BranchIoService');
const {generateMockUrl} = require('./test/InvitationLinkingMockService');

const logger = getLogger('FamilyInvitationHelper');

async function getFamilyInvitationUrl(payload) {
    const urlGenerationStrategy = DISABLE_BRANCHIO_INTEGRATION
        ? generateMockUrl
        : generateBranchIoUrl;

    logger.debug('Getting family invitation url...');

    const registrationToken = uuid();
    await setRedisCollectionData(
        FAMILY_INVITES,
        FAMILY_INVITES_COLLECTION_TTL_IN_SECS,
        registrationToken,
        {...payload}
    );
    return urlGenerationStrategy(registrationToken);
}

module.exports = {getFamilyInvitationUrl};
