const {
        delRedisCollectionData,
        setRedisCollectionData,
        getRedisCollectionData
    } = require('../RedisGateway'),
    {getUserByUserId} = require('./UserDao'),
    {getLogger} = require('../logs/LoggingService'),
    {
        REDIS_COLLECTIONS: {USERS_HASH},
        USERS_REDIS_COLLECTION_TTL_IN_SECS
    } = require('../constants');

async function setUserData(userId, data) {
    await setRedisCollectionData(USERS_HASH, USERS_REDIS_COLLECTION_TTL_IN_SECS, userId, data);
}

async function getUserData(userId) {
    return getRedisCollectionData(USERS_HASH, userId);
}

async function deleteUserData(userId) {
    return await delRedisCollectionData(USERS_HASH, userId);
}

async function updateUserEula(userId, accepted) {
    const logger = getLogger('UserCacheHelper::updateUserEula', {userId});
    try {
        logger.debug({metadata: {accepted}}, 'updating user eula...');
        const payload = await getUserData(userId);
        if (payload) {
            payload.acceptedEula = accepted;
            if (accepted) {
                payload.renewEula = accepted;
            }
            logger.debug(
                {metadata: {payload}},
                'set user data with new payload setting around eula...'
            );
            await setUserData(userId, payload);
        }
    } catch (error) {
        logger.error({error}, 'Error on updating a user eula status');
    }
}

async function rehydrateUser(userId, userData = null) {
    const logger = getLogger('UserCacheHelper::rehydrateUser', {userId});

    logger.debug('Rehydrating user...');
    let user = await getUserData(userId);
    if (!user) {
        logger.debug('No user data found in redis...');
        user = userData;

        if (!user) {
            logger.debug('Retrieving user data from database...');
            user = await getUserByUserId(userId);
        }

        if (user) {
            logger.debug('Setting user data...');
            await setUserData(userId, user);
        }
    }
    logger.debug('Returning user');
    return user;
}

module.exports = {
    deleteUserData,
    setUserData,
    rehydrateUser,
    updateUserEula,
    getUserData
};
