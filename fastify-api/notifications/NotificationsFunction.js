const {
        bootstrapNotificationHubClient,
        registerDevice,
        sendMessage
    } = require('./AzureNotificationHubGateway'),
    Ajv = require('ajv').default,
    schema = require('./schema'),
    {
        getLogger,
        createRegistrationId,
        CONSTANTS: {VERSION_HEADER_NAME}
    } = require('ohana-shared');

let schemaValidator = null;

function initializeValidator() {
    const ajv = new Ajv();
    schemaValidator = ajv.compile(schema);
}

initializeValidator();

const logger = getLogger('NotificationsFunction');

async function notificationsFunction(req, res) {
    logger.debug('ENTER:Notifications');

    const notificationHubClient = bootstrapNotificationHubClient();

    logger.debug('Loading json schema validator for push notifications ...');
    const valid = schemaValidator(req.body);

    // Do not send push notifications if validation is failed
    if (!valid) {
        const errors = schemaValidator.errors.map(
            ({dataPath, message}) => `${dataPath}: ${message}`
        );
        logger.error(
            {error: schemaValidator.errors},
            'Push notification message failed schema validation!'
        );

        return res.code(400).send(errors.join(', '));
    }

    const {payload, type} = req.body;
    const appVersion = req.headers[VERSION_HEADER_NAME];

    if (type === 'register') {
        const registrationId = await createRegistrationId(notificationHubClient);
        const {notificationPlatform, userId, deviceToken} = payload;
        const deviceRegistrationResult = await registerDevice(
            notificationHubClient,
            notificationPlatform,
            deviceToken,
            userId,
            registrationId,
            logger
        );

        logger.debug('EXIT:Notifications');
        return res.code(200).send(deviceRegistrationResult);
    } else if (type === 'send') {
        const {notificationPlatform, message, userId} = payload;
        const notificationSent = await sendMessage(
            notificationHubClient,
            notificationPlatform,
            userId,
            message,
            logger,
            appVersion
        );

        logger.debug('EXIT:Notifications');
        return res.code(200).send(notificationSent);
    }
}

module.exports = {notificationsFunction};
