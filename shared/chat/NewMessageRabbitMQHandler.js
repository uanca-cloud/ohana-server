const {extractOhanaId} = require('./ChatHelper'),
    {getPatientIdFromUlid} = require('../patient/PatientDao'),
    {NotFoundError} = require('../custom-errors'),
    {getLogger} = require('../logs/LoggingService'),
    {getChatUserInfoById} = require('../user/UserDao'),
    {publishNewChatMessage} = require('../pubsub/ChatUpdatePublisher');

const logger = getLogger('NewMessageRabbitMQHandler');

/**
 * Async handler for new chat messages from RabbitMQ.
 *
 * @async
 * @param {object} params - The parameters object.
 * @param {string} params.seed - Seed to extract patient ULID.
 * @param {object[]} params.recipients - The array of recipient objects.
 * @param {object} params.chat - The chat object related to the new message.
 * @param {string} params.senderId - The ULID of the sender.
 * @returns {Promise<void>} The function doesn't explicitly return a value; it ends when the new chat message publishing is done.
 * @throws {NotFoundError} Will throw a NotFoundError if no patient, sender, or recipients are found.
 */
async function newMessageRabbitMQHandler({seed, recipients, chat, senderId}) {
    const patientUlid = extractOhanaId(seed);
    const patientId = await getPatientIdFromUlid(patientUlid);

    if (!patientId) {
        logger.error({metadata: {patientUlid}}, 'Patient not found');
        throw new NotFoundError('Patient not found');
    }

    const senderUserId = extractOhanaId(senderId);
    const senderUser = await getChatUserInfoById(senderUserId);

    if (!senderUser) {
        logger.error({metadata: {userId: senderUserId}}, 'Sender not found');
        throw new NotFoundError('Sender not found');
    }

    const recipientIds = recipients.map((recipient) => extractOhanaId(recipient.identity));

    if (!recipientIds.length) {
        logger.error('No recipients found');
        throw new NotFoundError('No recipients found');
    }

    recipientIds.push(senderUserId);

    logger.debug(
        {metadata: {recipientIds, orderNumber: chat?.order}},
        'Message will be sent to the users'
    );

    await publishNewChatMessage(patientId, chat, senderUser, recipientIds);
}

module.exports = {
    newMessageRabbitMQHandler
};
