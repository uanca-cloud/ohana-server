let request = {},
    response = {},
    resolver,
    notificationHub = null;

beforeEach(() => {
    jest.mock('@azure/notification-hubs');

    resolver = require('./NotificationHubLogsFunction').notificationHubLogsFunction;

    jest.mock('@azure/notification-hubs', () => ({
        NotificationHubsClient: jest.fn(() => {
            return {
                notificationHubId: '123',
                listRegistrationsByTag: jest.fn (() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    }
                }),
                listRegistrations: jest.fn (() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    }
                })
            }
        })
    }));
    notificationHub = require('@azure/notification-hubs');

    request = {
        query: {
            userId: '12345'
        }
    };
    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('@azure/notification-hubs');
});

describe('Given we want to get notification hub logs from azure', () => {
    test('if a userId is given it should return status code 200 and filtered logs', async () => {
        await resolver(request, response);

        expect(response.code).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith({
            body: JSON.stringify([{registrationId: '1234'}]),
            status: 200
        });
    });

    test('if a userId is not given it should return status code 200 and unfiltered logs', async () => {
        request.query = {};
        await resolver(request, response);

        expect(response.code).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith({
            body: JSON.stringify([{registrationId: '1234'}]),
            status: 200
        });
    });

    test('if an error occurs it should return status code 500', async () => {
        notificationHub.NotificationHubsClient.mockImplementationOnce(jest.fn(() => {
            return {
                notificationHubId: '123',
                listRegistrationsByTag: jest.fn (() => {
                    return {
                        byPage: jest.fn(() => [{registrationId: '1234'}])
                    }
                }),
                listRegistrations: jest.fn (() => {
                    return {
                        byPage: jest.fn(() => [{registrationId: '1234'}])
                    }
                })
            }
        }));
        request.query = {};
        await resolver(request, response);

        expect(response.code).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith({
            body: undefined,
            status: 500
        });
    });
});
