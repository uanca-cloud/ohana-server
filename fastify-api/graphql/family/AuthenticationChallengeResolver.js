const {
    getFamilyMemberIdentity,
    getChallenge,
    CONSTANTS: {
        REDIS_COLLECTIONS: {LOGIN_CHALLENGES},
        LOGIN_CHALLENGES_COLLECTION_TTL_IN_SECS
    },
    setRedisCollectionData,
    getLogger,
    UnauthorizedError
} = require('ohana-shared');

async function AuthenticationChallengeResolver(_parent, args, context) {
    const {userId} = args;
    const logger = getLogger('AuthenticationChallengeResolver', {...context, userId});

    const identity = await getFamilyMemberIdentity(userId);
    if (!identity) {
        logger.error('Family member does not exist');
        throw new UnauthorizedError({description: 'Family member does not exist'});
    }

    const challengeString = getChallenge();
    await setRedisCollectionData(
        LOGIN_CHALLENGES,
        LOGIN_CHALLENGES_COLLECTION_TTL_IN_SECS,
        userId,
        {challengeString, publicKey: identity.publicKey}
    );
    return challengeString;
}

module.exports = AuthenticationChallengeResolver;
