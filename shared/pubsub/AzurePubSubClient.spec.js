let azurePubSubClient, MockWebPubSubServiceClient;

beforeEach(() => {
    MockWebPubSubServiceClient = {
        getClientAccessToken: jest.fn(() => ({
            url: jest.fn()
        })),
        userExists: jest.fn(() => true),
        removeUserFromAllGroups: jest.fn(),
        removeConnectionFromAllGroups: jest.fn(),
        closeConnection: jest.fn()
    };
    jest.mock('@azure/web-pubsub', () => {
        return {
            WebPubSubServiceClient: jest.fn().mockImplementation(() => MockWebPubSubServiceClient)
        };
    });

    azurePubSubClient = require('./AzurePubSubClient');
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Given we want to work with the pubsub client', () => {
    describe('When we have a connection', () => {
        test('then we run the createFromConnectionString function', async () => {
            await azurePubSubClient.generateUrl('user_id', 'device_id');
            expect(MockWebPubSubServiceClient.getClientAccessToken).toHaveBeenCalledTimes(1);
        });

        test('then we can check if a device is connected', async () => {
            await expect(azurePubSubClient.hasPubSubConnection('device_id')).resolves.toEqual(true);
        });

        test('then we remove a device from groups', async () => {
            await azurePubSubClient.removeUserFromGroups('user_id');
            expect(MockWebPubSubServiceClient.removeUserFromAllGroups).toHaveBeenCalledWith(
                'user_id'
            );
        });

        test('then we remove a connection from groups', async () => {
            await azurePubSubClient.removeConnectionFromGroups('connection_id');
            expect(MockWebPubSubServiceClient.removeConnectionFromAllGroups).toHaveBeenCalledWith(
                'connection_id'
            );
        });

        test('then we close a connection', async () => {
            await azurePubSubClient.closeConnection('connection_id', 'reason');
            expect(MockWebPubSubServiceClient.closeConnection).toHaveBeenCalledWith(
                'connection_id',
                {reason: 'reason'}
            );
        });
    });
});
