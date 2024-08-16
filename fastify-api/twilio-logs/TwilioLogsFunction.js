// TODO commenting out this code as auth rules will need to be added when exposing /logs endpoint in the future.
// const {
//     getLogger,
//     CONSTANTS: {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER}
// } = require('ohana-shared');
//
// const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
//
// const logger = getLogger('LogsFunction');
//
// async function twilioLogs(req, res) {
//     logger.debug('ENTER:Logs');
//
//     const client = await twilio;
//     const limit = parseInt(req.query.limit) || 20;
//
//     const messages = await client.messages.list({from: TWILIO_PHONE_NUMBER, limit});
//
//     const result = Object.values(messages).map((message) => {
//         return {
//             body: message.body,
//             direction: message.direction,
//             to: message.to,
//             from: message.from,
//             dateUpdated: message.dateUpdated,
//             errorMessage: message.errorMessage,
//             errorCode: message.errorCode,
//             status: message.status,
//             dateSent: message.dateSent,
//             dateCreated: message.dateCreated
//         };
//     });
//
//     logger.debug('EXIT:Logs');
//
//     res.code(200).send(result);
// }
//
// module.exports = {twilioLogs};
