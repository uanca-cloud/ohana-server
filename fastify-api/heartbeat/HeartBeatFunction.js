const {
    CONSTANTS: {
        REDIS_COLLECTIONS: {SESSION},
        CAREGIVER_EULA_LAST_CHANGED_DATE,
        FAMILY_MEMBER_EULA_LAST_CHANGED_DATE,
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER}
    },
    getRedisCollectionData
} = require('ohana-shared');
const {differenceInMilliseconds} = require('date-fns');

async function heartBeat(request, response) {
    const sessionId = request.headers.authorization
        ? request.headers.authorization.replace('Bearer ', '')
        : '';
    if (sessionId) {
        const user = await getRedisCollectionData(SESSION, sessionId);

        switch (user?.role) {
            case undefined:
                return response.code(403).send();
            case CAREGIVER:
                if (
                    differenceInMilliseconds(
                        new Date(user.eulaAcceptTimestamp),
                        new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                    ) < 0
                ) {
                    return response.code(451).send();
                }
                break;
            case FAMILY_MEMBER:
                if (
                    differenceInMilliseconds(
                        new Date(user.eulaAcceptTimestamp),
                        new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                    ) < 0
                ) {
                    return response.code(451).send();
                }
                break;
        }
    }
    response.code(204).send();
}

module.exports = {heartBeat};
