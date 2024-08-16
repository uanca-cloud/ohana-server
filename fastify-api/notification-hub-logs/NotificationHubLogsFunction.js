const {getLogger} = require('ohana-shared'),
    {NotificationHubsClient} = require('@azure/notification-hubs');

const logger = getLogger('NotificationHubLogsFunction');

async function notificationHubLogsFunction(req, res) {
    logger.debug('ENTER:NotificationHubLogsFunction');

    const notificationHubClient = new NotificationHubsClient(
        process.env.NOTIFICATION_HUB_CONNECTION_STRING,
        process.env.NOTIFICATION_HUB_NAME
    );
    const tag = req.query.userId || '';

    let registrations;
    let result;
    try {
        if (tag) {
            registrations = notificationHubClient.listRegistrationsByTag(tag);
        } else {
            registrations = notificationHubClient.listRegistrations();
        }

        const registeredDevices = [];
        for await (const pages of registrations.byPage()) {
            for (const item of pages) {
                registeredDevices.push(item);
            }
        }

        result = {
            status: 200,
            body: JSON.stringify(registeredDevices)
        };
    } catch (error) {
        logger.error({error}, 'Error occurred while interacting with the notification hub client!');
        result = {
            status: 500,
            body: error.stackTrace
        };
    }

    res.code(200).send(result);

    logger.debug('EXIT:NotificationHubLogsFunction');
}

module.exports = {notificationHubLogsFunction};
