const {updateUserEULAAcceptanceDate, updateSessionEula, updateUserEula} = require('ohana-shared');

async function UpdateEULAAcceptanceStatusResolver(_parent, args, {userId, sessionId}) {
    const {acceptedEula} = args;

    let timestamp = null;
    if (acceptedEula) {
        timestamp = await updateUserEULAAcceptanceDate(userId);
    }

    await Promise.all([
        updateSessionEula(sessionId, timestamp),
        updateUserEula(userId, acceptedEula)
    ]);

    return !!timestamp;
}

module.exports = UpdateEULAAcceptanceStatusResolver;
