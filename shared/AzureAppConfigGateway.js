const {AppConfigurationClient} = require('@azure/app-configuration'),
    {APP_CONFIG_CONNECTION_STRING} = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('AzureAppConfigGateway');

/**
 *
 * @param {string} tenantId
 * @returns {Promise<{rmq: {credential: string, secret: string}, http: {credential: string, secret: string}}>}
 */
async function getKeysByTenant(tenantId) {
    logger.debug('Getting keys by tenant id...');
    const startTime = Date.now();

    const client = new AppConfigurationClient(APP_CONFIG_CONNECTION_STRING);
    const retrievedKeys = client.listConfigurationSettings({
        labelFilter: tenantId
    });

    let httpCredential = null;
    let httpSecret = null;
    let rmqCredential = null;
    let rmqSecret = null;

    for await (const setting of retrievedKeys) {
        if (setting.key === `CSA_HTTP_CREDENTIAL`) {
            httpCredential = setting.value;
        }
        if (setting.key === `CSA_HTTP_SECRET`) {
            httpSecret = setting.value;
        }
        if (setting.key === `CSA_RMQ_CREDENTIAL`) {
            rmqCredential = setting.value;
        }
        if (setting.key === `CSA_RMQ_SECRET`) {
            rmqSecret = setting.value;
        }
    }

    logger.info(
        {
            metadata: {
                httpCred: !!httpCredential,
                httpSecret: !!httpSecret,
                rmqCred: !!rmqCredential,
                rmqSecret: !!rmqSecret,
                duration: Date.now() - startTime
            }
        },
        'Located credentials'
    );

    return {
        http: {credential: httpCredential, secret: httpSecret},
        rmq: {credential: rmqCredential, secret: rmqSecret}
    };
}

module.exports = {
    getKeysByTenant
};
