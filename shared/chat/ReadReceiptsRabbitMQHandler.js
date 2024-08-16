const {extractOhanaId} = require('./ChatHelper'),
    {getPatientIdFromUlid} = require('../patient/PatientDao'),
    {NotFoundError} = require('../custom-errors'),
    {getLogger} = require('../logs/LoggingService'),
    {publishChatReadReceipt} = require('../pubsub/ReadReceiptsUpdatePublisher');

const logger = getLogger('ReadReceiptRabbitMQHandler');

/**
 *
 * @param payload
 * @returns {Promise<void>}
 */
async function readReceiptsRabbitMQHandler(payload) {
    const {seed, recipients, orderNumber} = payload;
    const patientUlid = extractOhanaId(seed);
    const patientId = await getPatientIdFromUlid(patientUlid);

    if (!patientId) {
        logger.error({metadata: {patientUlid}}, 'Patient not found');
        throw new NotFoundError('Patient not found');
    }

    const recipientIds = recipients.map((recipient) => extractOhanaId(recipient.identity));

    logger.debug(
        {metadata: {recipientIds, orderNumber}},
        'Read receipt event will be sent to the users'
    );

    if (!recipientIds.length) {
        logger.error('No recipients found');
        throw new NotFoundError('No recipients found');
    }

    await publishChatReadReceipt(patientId, orderNumber, recipientIds);
}

module.exports = {
    readReceiptsRabbitMQHandler
};
