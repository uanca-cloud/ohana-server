const {
        updateExpiration,
        setRedisHashMap,
        getRedisHashMap,
        getAllRedisHashes,
        setRedisCollectionData,
        deleteRedisHashMap,
        delRedisCollectionData,
        getRedisCollectionData
    } = require('./RedisGateway'),
    {
        OHANA_ROLES: {CAREGIVER, ADMINISTRATOR},
        REDIS_COLLECTIONS: {SESSION},
        LATEST_SESSIONS_HASH,
        SESSION_REDIS_COLLECTION_TTL_IN_SECS
    } = require('./constants'),
    {UserInputError} = require('./custom-errors'),
    {getLogger} = require('./logs/LoggingService'),
    {v4: uuid} = require('uuid'),
    {deleteUserData} = require('./user/UserCacheHelper');

let logger = getLogger('SessionService');

async function getSession(sessionId) {
    return getRedisCollectionData(SESSION, sessionId);
}

async function updateSession(role, sessionId, sessionInactivityTimeoutInSecs, userId) {
    logger.debug({metadata: {userId, sessionId}}, 'Updating session...');
    // ADMIN role is ignored because the admin session is handled separately by the DHP
    if (role === ADMINISTRATOR) {
        logger.info({metadata: {userId, sessionId}}, 'User is admin...');
        return;
    }

    try {
        if (sessionInactivityTimeoutInSecs > 0) {
            logger.debug('Updating session expiration date...');
            await updateExpiration(SESSION, sessionInactivityTimeoutInSecs, sessionId);

            const oldHashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
            if (oldHashSet) {
                const sessionIds = JSON.parse(oldHashSet).sessionIds;
                const oldRole = JSON.parse(oldHashSet).role;
                const tenantShortCode = JSON.parse(oldHashSet).tenantShortCode;
                const subscriptionId = JSON.parse(oldHashSet).subscriptionId;
                await setRedisHashMap(LATEST_SESSIONS_HASH, userId, {
                    createdAt: Date.now(),
                    sessionIds,
                    role: oldRole,
                    tenantShortCode,
                    subscriptionId
                });
            }
        } else {
            logger.info('Invalid session inactivity timeout value');
        }
    } catch (error) {
        logger.error({error});
        throw new UserInputError({message: 'Invalid session', error});
    }
}

async function updateSessionEula(sessionId, timestamp) {
    const metadata = {sessionId};
    try {
        const payload = await getRedisCollectionData(SESSION, sessionId);
        logger.debug({metadata}, 'Updating session with current eula acceptance status');

        payload.eulaAcceptTimestamp = timestamp;

        await setRedisCollectionData(
            SESSION,
            SESSION_REDIS_COLLECTION_TTL_IN_SECS,
            sessionId,
            payload
        );
        logger.debug(
            {metadata},
            'Successfully updated session with current eula acceptance status'
        );
    } catch (error) {
        logger.error({error, metadata});
        throw new UserInputError({message: 'Invalid session', error});
    }
}

async function createSession(userId, payload) {
    logger.debug({metadata: {userId}}, 'Creating session by user id...');
    const sessionId = uuid();

    await setRedisCollectionData(SESSION, SESSION_REDIS_COLLECTION_TTL_IN_SECS, sessionId, payload);

    const oldHashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
    if (oldHashSet) {
        const sessionIds = JSON.parse(oldHashSet).sessionIds;
        sessionIds.push(sessionId);
        await setRedisHashMap(LATEST_SESSIONS_HASH, userId, {
            createdAt: Date.now(),
            sessionIds,
            role: payload.role,
            tenantShortCode: payload.tenantShortCode,
            subscriptionId: payload.subscriptionId
        });
    } else {
        await setRedisHashMap(LATEST_SESSIONS_HASH, userId, {
            createdAt: Date.now(),
            sessionIds: [sessionId],
            role: payload.role,
            tenantShortCode: payload.tenantShortCode,
            subscriptionId: payload.subscriptionId
        });
    }

    return sessionId;
}

async function deleteSessionByUserId(userId) {
    logger.debug({metadata: {userId}}, 'Deleting session by user id...');
    const json = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);

    if (!json) {
        return;
    }

    const sessionIds = JSON.parse(json).sessionIds;

    const deletePromises = sessionIds.map((sessionId) =>
        delRedisCollectionData(SESSION, sessionId)
    );

    await Promise.all(deletePromises);

    await deleteRedisHashMap(LATEST_SESSIONS_HASH, [userId]);
}

/**
 * Clear redis hashes and collections related to the user ids
 * @param userIds
 * @returns {Promise<void>}
 */
async function deleteSessionsByUserIds(userIds) {
    const metadata = {userIds};
    if (!userIds?.length > 0) {
        logger.debug({metadata}, 'No user ids to delete...');
        return;
    }
    const sessionHashes = await getAllRedisHashes(LATEST_SESSIONS_HASH);
    if (!sessionHashes) {
        logger.debug({metadata}, 'No redis session hashes to delete...');
        return;
    }
    const sessionIdsToDelete = Object.entries(sessionHashes).flatMap(([userId, userData]) => {
        if (userIds.includes(userId)) {
            const sessionIds = JSON.parse(userData)?.sessionIds;
            return sessionIds || [];
        }
        return [];
    });

    const deleteUserPromises = userIds.map((userId) => deleteUserData(userId));
    const deleteSessionPromises = sessionIdsToDelete.map((sessionId) =>
        delRedisCollectionData(SESSION, sessionId)
    );

    await Promise.allSettled([
        ...deleteSessionPromises,
        ...deleteUserPromises,
        deleteRedisHashMap(LATEST_SESSIONS_HASH, userIds)
    ]);
}

async function deleteSessionBySessionId(sessionId) {
    logger.debug({metadata: {sessionId}}, 'Deleting session by session id...');
    const session = await getRedisCollectionData(SESSION, sessionId);
    if (!session) {
        return;
    }

    await delRedisCollectionData(SESSION, sessionId);

    return deleteSessionFromIndex(session.userId, sessionId);
}

async function deleteSessionFromIndex(userId, sessionId) {
    const json = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);

    const sessionIds = JSON.parse(json).sessionIds;
    const role = JSON.parse(json).role;
    const tenantShortCode = JSON.parse(json).tenantShortCode;
    const subscriptionId = JSON.parse(json).subscriptionId;

    const newSessionIds = sessionIds.filter((session) => session !== sessionId);

    if (newSessionIds.length) {
        await setRedisHashMap(LATEST_SESSIONS_HASH, userId, {
            createdAt: Date.now(),
            sessionIds: newSessionIds,
            role,
            tenantShortCode,
            subscriptionId
        });
    } else {
        await deleteRedisHashMap(LATEST_SESSIONS_HASH, [userId]);
    }

    return newSessionIds;
}

async function refreshSessionIndex() {
    logger.debug('Refreshing session index...');
    const usersToBeUnassociated = [];
    const caregiversToBeUnassociated = [];
    const sessionCaregivers = await getAllRedisHashes(LATEST_SESSIONS_HASH);

    for (const field in sessionCaregivers) {
        const {sessionIds, createdAt, role, tenantShortCode, subscriptionId} = JSON.parse(
            sessionCaregivers[field]
        );

        if (sessionIds?.length) {
            const newSessions = [];

            for (let sessionId of sessionIds) {
                const user = await getRedisCollectionData(SESSION, sessionId);
                if (user) {
                    newSessions.push(sessionId);
                }
            }

            if (!newSessions.length) {
                usersToBeUnassociated.push(field);
                if (role === CAREGIVER) {
                    caregiversToBeUnassociated.push({userId: field, role, tenantShortCode});
                }
            } else {
                await setRedisHashMap(LATEST_SESSIONS_HASH, field, {
                    createdAt,
                    sessionIds: newSessions,
                    role,
                    tenantShortCode,
                    subscriptionId
                });
            }
        }
    }

    if (usersToBeUnassociated.length) {
        await deleteRedisHashMap(LATEST_SESSIONS_HASH, usersToBeUnassociated);
    }

    if (usersToBeUnassociated.length || caregiversToBeUnassociated.length) {
        logger.info(
            {metadata: {usersToBeUnassociated, caregiversToBeUnassociated}},
            'Session index refreshed'
        );
    }

    return caregiversToBeUnassociated;
}

async function insertSessionMappedPatientByIds(patientIds, userId) {
    try {
        const logger = getLogger('SessionService::insertSessionMappedPatientById', {userId});
        logger.info({metadata: {patientIds: patientIds}}, 'Adding patient(s) to session...');

        const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);

        if (!hashSet) {
            logger.info('no hashsets found with userId...');
            return;
        }
        const sessionIds = JSON.parse(hashSet).sessionIds;
        const patientIdsAsNumbers = patientIds.map(Number);

        for (let sessionId of sessionIds) {
            const payload = await getRedisCollectionData(SESSION, sessionId);

            if (!payload) {
                logger.info('no payload found with userId...');
                continue;
            }

            payload.mappedPatients = payload?.mappedPatients ?? [];
            payload.mappedPatients.push(...patientIdsAsNumbers);

            const uniqueMappedPatients = new Set(payload.mappedPatients);
            payload.mappedPatients = Array.from(uniqueMappedPatients);

            await setRedisCollectionData(
                SESSION,
                SESSION_REDIS_COLLECTION_TTL_IN_SECS,
                sessionId,
                payload
            );
            logger.info(
                {metadata: {patientIds: patientIds}},
                `Inserted session with mapped patient(s)`
            );
        }
    } catch (error) {
        logger.error({error}, 'Error on adding patient(s) to session');
        throw new UserInputError({message: 'Error on adding patient to session', error});
    }
}

async function removeSessionMappedPatientById(patientId, userId) {
    try {
        const logger = getLogger('SessionService::removeSessionMappedPatientById', {userId});
        logger.info({metadata: {patientId}}, 'removing patient from session...');

        const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);

        if (!hashSet) {
            logger.info('no hashsets found with userId...');
            return;
        }

        const sessionIds = JSON.parse(hashSet).sessionIds;

        for (let sessionId of sessionIds) {
            const payload = await getRedisCollectionData(SESSION, sessionId);
            if (!payload) {
                logger.info('no payload found with userId...');
                continue;
            }

            const index = payload.mappedPatients.indexOf(parseInt(patientId));
            if (index === -1) {
                logger.info('no patientId found in user session mapped patients...');
                continue;
            }

            payload.mappedPatients.splice(index, 1);

            await setRedisCollectionData(
                SESSION,
                SESSION_REDIS_COLLECTION_TTL_IN_SECS,
                sessionId,
                payload
            );
            logger.info(
                {metadata: {patientId, sessionId}},
                `Removed patientId from user's session of mapped patients`
            );
        }
    } catch (error) {
        logger.error({error}, 'Error on removing patient from session');
        throw new UserInputError({message: 'Error on removing patient from session', error});
    }
}

async function removeSessionMappedPatientForAllUsers(patientId, userIds) {
    const metadata = {userIds};
    if (!userIds?.length > 0) {
        logger.debug({metadata}, 'No userIds to delete...');
        return;
    }

    await Promise.allSettled(
        userIds.map((userId) => removeSessionMappedPatientById(patientId, userId))
    );
}

async function updateChatCountForPatient(userIds, patientId, increment = true) {
    const userChatCounts = [];
    for (let userId of userIds) {
        let chatCount = await getChatCountForPatientId(userId, patientId);
        if (increment) {
            chatCount += 1;
        } else if (chatCount > 0) {
            chatCount -= 1;
        }
        await setChatCountForPatientId(userId, patientId, chatCount);
        userChatCounts[userId] = chatCount;
    }
    return userChatCounts;
}

async function setChatCountForPatientId(userId, patientId, chatCount) {
    const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
    if (hashSet) {
        const json = JSON.parse(hashSet);
        if (!json.chatCounts) {
            json.chatCounts = {};
        }
        json.chatCounts[patientId] = chatCount;
        await setRedisHashMap(LATEST_SESSIONS_HASH, userId, json);
    }
}

async function setChatReadReceiptsSubscriptionId(userId, subscriptionId) {
    const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
    if (hashSet) {
        const json = JSON.parse(hashSet);
        json.subscriptionId = subscriptionId;
        await setRedisHashMap(LATEST_SESSIONS_HASH, userId, json);
    }
}

async function getChatCountForPatientId(userId, patientId) {
    const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
    if (hashSet) {
        const json = JSON.parse(hashSet);
        if (json.chatCounts) {
            return parseInt(json.chatCounts[patientId]) || 0;
        }
    }
    return 0;
}

async function getChatReadReceiptsSubscriptionId(userId) {
    const hashSet = await getRedisHashMap(LATEST_SESSIONS_HASH, userId);
    if (hashSet) {
        const json = JSON.parse(hashSet);
        return json.subscriptionId;
    }

    return null;
}

module.exports = {
    getSession,
    updateSession,
    updateSessionEula,
    createSession,
    deleteSessionByUserId,
    deleteSessionBySessionId,
    refreshSessionIndex,
    deleteSessionsByUserIds,
    insertSessionMappedPatientByIds,
    removeSessionMappedPatientById,
    removeSessionMappedPatientForAllUsers,
    updateChatCountForPatient,
    getChatCountForPatientId,
    setChatCountForPatientId,
    setChatReadReceiptsSubscriptionId,
    getChatReadReceiptsSubscriptionId
};
