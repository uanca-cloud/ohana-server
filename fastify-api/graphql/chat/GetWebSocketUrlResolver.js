const {getLogger, generateUrl} = require('ohana-shared');

async function GetWebSocketUrlResolver(_parent, _args, {deviceId, userId}) {
    const logger = getLogger('GetWebSocketUrlResolver', {deviceId, userId});

    logger.debug('Generating new WS URL...');

    return {url: generateUrl(userId, deviceId)};
}

module.exports = GetWebSocketUrlResolver;
