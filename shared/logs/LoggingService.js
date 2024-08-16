const pino = require('pino'),
    redact = require('redact-object').default,
    pjson = require('../package.json');

const {
    DEFAULT_LOG_LEVEL,
    LOGGING_BUFFER_MIN_LENGTH_IN_BYTES,
    REDACTED_KEYS
} = require('../constants.js');

const {isProdEnv, isLocal} = require('../EnvironmentHelper');
const {isKeywordPresent} = require('./LoggingServiceHelper');
const keywordSet = new Set(REDACTED_KEYS);

const DEFAULT_PINO_DESTINATION = pino.destination({
    sync: false,
    fd: process.stdout.fd,
    minLength: LOGGING_BUFFER_MIN_LENGTH_IN_BYTES,
    maxLength: Math.max(LOGGING_BUFFER_MIN_LENGTH_IN_BYTES * 4, 2048),
    maxWrite: Math.max(LOGGING_BUFFER_MIN_LENGTH_IN_BYTES * 4, 2048)
});

const LOCAL_PINO_DESTINATION = pino.destination({
    sync: true,
    fd: process.stdout.fd
});

const pinoDestination = isLocal() ? LOCAL_PINO_DESTINATION : DEFAULT_PINO_DESTINATION;

const formatRedaction = (val) => {
    if (isProdEnv()) {
        return 'REDACTED';
    }

    return val;
};
const redactor = (data) => {
    if (data) {
        const foundAny = isKeywordPresent(data, keywordSet);
        if (foundAny) {
            data = {
                ...data,
                securityLogs: true
            };
        }
    }
    data = {
        ...data,
        buildNumber: pjson.version
    };
    return redact(data, REDACTED_KEYS, formatRedaction);
};

const serializers = {};
if (isProdEnv()) {
    serializers.error = (error) => {
        const name = typeof error.constructor === 'function' ? error.constructor.name : error.name;
        const message = error.message;
        const code = error.code || error.extensions?.code;
        return {name, message, code};
    };
} else {
    serializers.error = pino.stdSerializers.wrapErrorSerializer((serializedErr) => {
        const {message, type: name, stack} = serializedErr;
        const code = serializedErr.code || serializedErr.extensions?.code;
        return {name, message, code, stack};
    });
}

const transport = isLocal()
    ? {
          transport: {
              target: 'pino-pretty',
              options: {
                  colorize: true
              }
          }
      }
    : {};

const logInstance = pino.pino(
    {
        level: DEFAULT_LOG_LEVEL,
        messageKey: 'message',
        errorKey: 'error',
        formatters: {
            level(label) {
                return {
                    level: label.toUpperCase()
                };
            },
            log(object) {
                return {...object, metadata: redactor(object.metadata)};
            }
        },
        serializers,
        ...transport,
        timestamp: pino.stdTimeFunctions.isoTime,
        customLevels: {
            client: 70
        }
    },
    pinoDestination
);

function getLogger(name, userContext) {
    let instance = userContext?.log ?? logInstance;
    let loggerContext;
    if (userContext) {
        const {
            tenantId,
            userId,
            sessionId,
            version,
            errorCode,
            orderNumber,
            recipientIds,
            deviceId
        } = userContext;
        loggerContext = {
            tenantId,
            userId,
            sessionId,
            version,
            errorCode,
            orderNumber,
            recipientIds,
            deviceId
        };
    }
    return instance.child({name, metadata: redactor(loggerContext)});
}

function getFastifyLogger() {
    return logInstance;
}

function flush() {
    pinoDestination.flushSync();
}

module.exports = {
    getLogger,
    getFastifyLogger,
    flush
};
