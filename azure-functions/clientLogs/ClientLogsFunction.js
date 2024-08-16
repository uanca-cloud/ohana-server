const {
        bootstrapClientLogUpload,
        getSession,
        getLogger,
        CONSTANTS: {DISABLE_CLIENT_LOGS}
    } = require('ohana-shared'),
    {inflate} = require('pako');

const ENCODING_PREFIX = '--++';
const MIN_MESSAGE_LENGTH = ENCODING_PREFIX.length + 2; // for [ and ]

let bootstrapped = false;
const logger = getLogger('ClientLogsFunction');

function asciiToUint8Array(str) {
    const chars = [];
    for (let i = 0; i < str.length; ++i) {
        chars.push(str.charCodeAt(i));
    }
    return new Uint8Array(chars);
}

async function ClientLogsFunction(_context, req) {
    logger.debug('ENTER:ClientLogs');

    if (DISABLE_CLIENT_LOGS) {
        logger.debug('EXIT:ClientLogs - Client Logs Disabled');
        return {
            httpResponse: {
                status: 200
            }
        };
    }

    if (!bootstrapped) {
        await bootstrapClientLogUpload();
    }

    const sessionId = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : null;
    const user = await getSession(sessionId);

    // if they don't have a session, don't allow them to proceed
    if (!user) {
        logger.error({metadata: {sessionId}}, 'User is not authenticated');
        logger.debug('EXIT:ClientLogs');
        return {
            httpResponse: {
                status: 403,
                body: 'Forbidden'
            }
        };
    }

    const {rawBody} = req;
    const contentEncoding = req.headers['content-encoding'];
    let stringBody = rawBody;
    if (contentEncoding === 'gzip') {
        try {
            const gzipArrayBuffer = asciiToUint8Array(rawBody);
            stringBody = inflate(gzipArrayBuffer, {to: 'string'});
        } catch (error) {
            logger.error({error, metadata: {sessionId}}, 'Bad input: content is not gzip');
            logger.debug('EXIT:ClientLogs');
            return {
                httpResponse: {
                    status: 400,
                    body: 'Bad input'
                }
            };
        }
    }

    if (stringBody && stringBody.length <= MIN_MESSAGE_LENGTH) {
        logger.error({metadata: {sessionId}}, 'Bad input: minimum length error');
        logger.debug('EXIT:ClientLogs');
        return {
            httpResponse: {
                status: 400,
                body: 'Bad input'
            }
        };
    }

    // We use a prefix to disable auto JSON decoding by the function and have a secret
    const requestPrefix = stringBody.slice(0, ENCODING_PREFIX.length);
    const hasValidPrefix = requestPrefix === ENCODING_PREFIX;
    if (!hasValidPrefix) {
        logger.error({metadata: {sessionId}}, 'Bad input: invalid prefix');
        logger.debug('EXIT:ClientLogs');
        return {
            httpResponse: {
                status: 400,
                body: 'Bad input'
            }
        };
    }

    // We assume that all logs are a JSON encoded array of objects in the following form:
    // [{ invocationId, level, name, message, sessionId }, ... ]
    // We don't use JSON.parse to validate for performance reasons
    const logBody = stringBody.slice(ENCODING_PREFIX.length);
    const isValidArray =
        logBody.slice(0, 1) === '[' && logBody.slice(logBody.length - 1, logBody.length) === ']';
    if (!isValidArray) {
        logger.error({metadata: {sessionId}}, 'Bad input: invalid Array format');
        logger.debug('EXIT:ClientLogs');
        return {
            httpResponse: {
                status: 400,
                body: 'Bad input'
            }
        };
    }

    logger.client({metadata: {sessionId}}, logBody);

    logger.debug('EXIT:ClientLogs');
    return {
        httpResponse: {
            status: 200
        }
    };
}

module.exports = ClientLogsFunction;
