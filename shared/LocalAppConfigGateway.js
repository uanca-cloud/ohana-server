const {getLogger} = require('./logs/LoggingService');
require('dotenv').config({path: __dirname + `/.tenant.env`});

const logger = getLogger('LocalAppConfigGateway');

/**
 *
 * @param {string} glob
 * @returns {Promise<{rmq: {credential: string, secret: string}, http: {credential: string, secret: string}}>}
 */
async function getKeysByGlob(glob) {
    const startTime = Date.now();
    const regex = RegExp(glob);
    const matchedEntries = Object.fromEntries(
        Object.entries(process.env).filter(([key, _value]) => !!regex.exec(key))
    );
    logger.info(
        {metadata: {duration: Date.now() - startTime}},
        'Local tenant credentials retrieved'
    );

    return {
        http: {
            credential: matchedEntries[`${glob}HTTP_CREDENTIAL`] || null,
            secret: matchedEntries[`${glob}HTTP_SECRET`] || null
        },
        rmq: {
            credential: matchedEntries[`${glob}RMQ_CREDENTIAL`] || null,
            secret: matchedEntries[`${glob}RMQ_SECRET`] || null
        }
    };
}

module.exports = {
    getKeysByGlob
};
