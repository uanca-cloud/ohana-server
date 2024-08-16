// TODO commenting out this code as auth rules will need to be added when exposing /logs endpoint in the future.
// let request = {},
//     response = {},
//     resolver;
//
// const mockBody = {
//     message: {
//         body: 'body',
//         direction: 'direction',
//         to: 'to',
//         from: 'from',
//         dateUpdated: 'dateUpdated',
//         errorMessage: 'errorMessage',
//         errorCode: 'errorCode',
//         status: 'status',
//         dateSent: 'dateSent',
//         dateCreated: 'dateCreated'
//     }
// };
//
// beforeEach(() => {
//     jest.mock('twilio', () =>
//         jest.fn((_accountSid, _authToken) =>
//             Promise.resolve({
//                 messages: {
//                     list: async () => {
//                         return mockBody;
//                     }
//                 }
//             })
//         )
//     );
//
//     resolver = require('./TwilioLogsFunction').twilioLogs;
//
//     request = {
//         query: {
//             limit: 10
//         }
//     };
//
//     response = {
//         code: jest.fn().mockReturnThis(),
//         send: jest.fn().mockReturnThis()
//     };
// });
//
// afterEach(() => {
//     jest.unmock('ohana-shared');
//     jest.unmock('twilio');
// });

describe.skip('Given we want to send a request to the schema endpoint', () => {
    test.skip('then it should return status code 200 and the found logs', async () => {
        //await resolver(request, response);
        // expect(response.code).toHaveBeenCalledWith(200);
        // expect(response.send).toHaveBeenCalledWith([mockBody.message]);
    });
});
