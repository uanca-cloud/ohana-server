let request = {},
    response = {},
    resolver;

beforeEach(() => {
    jest.mock('./AzureNotificationHubGateway', () => ({
        bootstrapNotificationHubClient: jest.fn(() => {}),
        registerDevice: jest.fn(() => 'Device registered'),
        sendMessage: jest.fn(() => 'Notification sent')
    }));

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        createRegistrationId: jest.fn(() => '123-456-789'),
        getLogger: jest.fn(() => {
            return {
                debug: jest.fn(),
                error: jest.fn()
            };
        })
    }));

    resolver = require('./NotificationsFunction').notificationsFunction;
    request = {
        body: {
            payload: {
                notificationPlatform: 'gcm',
                userId: '12345',
                deviceToken: '54321',
                message: {
                    data: {
                        message: 'Hello World!'
                    }
                }
            },
            type: 'register'
        },
        headers: {'x-ohana-version': '1.9.0'}
    };
    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('./AzureNotificationHubGateway');
});

describe('Given we want to send a request to the notification endpoint', () => {
    test('if the request body fails the schema validation it should return status code 400', async () => {
        request.body.payload = {};
        await resolver(request, response);
        expect(response.code).toHaveBeenCalledWith(400);
        expect(response.send).toHaveBeenCalledWith(
            "undefined: must have required property 'message', undefined: must have required property 'deviceToken', undefined: must match a schema in anyOf"
        );
    });
    test('if the request type is "register" then it should return status code 200 and the registration result', async () => {
        await resolver(request, response);
        expect(response.code).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith('Device registered');
    });
    test('if the request type is "send" then it should return status code 200 and the send result', async () => {
        request.body.type = 'send';
        await resolver(request, response);
        expect(response.code).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith('Notification sent');
    });
});
