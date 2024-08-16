let createHandler,
    ohanaShared,
    schema,
    destroyHandler,
    createServerAndSocket,
    makeServerless,
    createSocket,
    authorizeRequest,
    unWatchConnectionReadReceipts,
    disconnect;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        closeConnection: jest.fn(),
        getLogger: jest.fn(() => {
            return {
                debug: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn(),
                bindings: jest.fn(),
                client: jest.fn()
            };
        }),
        hasPubSubConnection: jest.fn(),
        getSession: jest.fn(),
        unWatchReadReceipt: jest.fn(),
        unWatchAllChatSubscriptions: jest.fn(),
        getChatReadReceiptsSubscriptionId: jest.fn(),
        getUserAndTenantIdsFromDeviceId: jest.fn(),
        getTenantShortCode: jest.fn(),
        removeConnectionFromGroups: jest.fn(),
        listenForDisconnect: jest.fn((cb) => () => cb()),
        listenForCompletes: jest.fn((cb) => () => cb()),
        publishDisconnect: jest.fn(),
        CONSTANTS: {
            WEBSOCKET_INIT_TIMEOUT_IN_MILLIS: 3000,
            WEBSOCKET_CLOSE_CODES: {
                HOST_DISCONNECT: 1011,
                OTHER_HOST_DISCONNECT: 1012,
                SERVER_SHUTDOWN: 999
            }
        },
        graphQLSchema: {
            typeDefs: jest.fn()
        },
        NotFoundError: jest.fn(() => ({
            extensions: {
                code: 'NOT_FOUND'
            }
        }))
    }));
    jest.mock('../SchemaWithMiddleware', () => ({
        resolvers: jest.fn()
    }));
    jest.mock('./makeServerless', () =>
        jest.fn(() => ({
            opened: () => jest.fn()
        }))
    );
    jest.mock('./AzureWebPubSubSocket', () =>
        jest.fn(() => ({
            createSocket: jest.fn()
        }))
    );
    jest.mock('events');

    ohanaShared = require('ohana-shared');
    createHandler = require('./AzureWebPubSubHandler').createHandler;
    destroyHandler = require('./AzureWebPubSubHandler').destroyHandler;
    createServerAndSocket = require('./AzureWebPubSubHandler').createServerAndSocket;
    authorizeRequest = require('./AzureWebPubSubHandler').authorizeRequest;
    disconnect = require('./AzureWebPubSubHandler').disconnect;
    unWatchConnectionReadReceipts =
        require('./AzureWebPubSubHandler').unWatchConnectionReadReceipts;
    makeServerless = require('./makeServerless');
    createSocket = require('./AzureWebPubSubSocket');

    schema = ohanaShared.graphQLSchema.typeDefs;
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('../SchemaWithMiddleware');
    jest.unmock('./makeServerless');
    jest.unmock('./AzureWebPubSubSocket');
    jest.unmock('events');
});

describe('Given we want to work with the handler functions', () => {
    describe('When we call the handler creation function', () => {
        test('then it should create the handler object', async () => {
            const handler = await createHandler(schema, 'hub', '/eventhandler', [
                'https://some-url-here.webpubsub.azure.com'
            ]);
            expect(handler).toBeTruthy();
            expect(ohanaShared.listenForDisconnect).toHaveBeenCalled();
            expect(ohanaShared.listenForCompletes).toHaveBeenCalled();
        });
    });

    describe('When we call the handler teardown function', () => {
        test('then it should destroy the handler', async () => {
            await createHandler(schema, 'hub', '/eventhandler', [
                'https://some-url-here.webpubsub.azure.com'
            ]);
            await createServerAndSocket(schema, 'connection_id', {});
            await destroyHandler();
            expect(ohanaShared.closeConnection).toHaveBeenCalled();
        });
    });

    describe('When we call the create socket function', () => {
        test('then it should create the socket', async () => {
            await createHandler(schema, 'hub', '/eventhandler', [
                'https://some-url-here.webpubsub.azure.com'
            ]);
            await createServerAndSocket(schema, 'connection_id', {});
            expect(makeServerless).toHaveBeenCalled();
            expect(createSocket).toHaveBeenCalled();
        });
    });

    describe('When we want to authorize the session header', () => {
        test('then it returns the session if valid', async () => {
            const mockSession = {userId: '123-123', deviceId: '1234-1243'};
            ohanaShared.getSession.mockResolvedValueOnce(mockSession);
            const result = await authorizeRequest({
                connectionParams: {authorization: 'Bearer TEST'}
            });
            expect(result).toBe(mockSession);
        });
    });

    describe('When we want to disconnect', () => {
        test('then it publishes the disconnect', async () => {
            await createServerAndSocket(schema, 'connection_id', {});
            await disconnect('connection_id', 1011, 'Shutdown', true);
            expect(ohanaShared.publishDisconnect).toHaveBeenCalled();
        });

        test('then it skips the disconnect publish', async () => {
            await createServerAndSocket(schema, 'connection_id', {});
            await disconnect('connection_id', 999, 'Shutdown');
            expect(ohanaShared.publishDisconnect).not.toHaveBeenCalled();
        });
    });

    describe('When we want to unwatch CSA read receipts', () => {
        test('then we get an error if user is missing', async () => {
            try {
                await unWatchConnectionReadReceipts('123-123');
            } catch (error) {
                expect(error.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then we get an error if tenant id is missing', async () => {
            ohanaShared.getUserAndTenantIdsFromDeviceId.mockResolvedValueOnce({
                userId: '123',
                tenantId: '0000'
            });
            try {
                await unWatchConnectionReadReceipts('123-123');
            } catch (error) {
                expect(error.extensions.code).toBe('NOT_FOUND');
            }
        });

        test("then we don't close anything if there are more open connections", async () => {
            ohanaShared.getUserAndTenantIdsFromDeviceId.mockResolvedValueOnce({
                userId: '123',
                tenantId: '0000'
            });
            ohanaShared.getTenantShortCode.mockResolvedValueOnce('0000');
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(true);
            await unWatchConnectionReadReceipts('123-123');
            expect(ohanaShared.unWatchReadReceipt).not.toHaveBeenCalled();
            expect(ohanaShared.unWatchAllChatSubscriptions).not.toHaveBeenCalled();
        });

        test('then we call the function for closing a subscription if there are no more open connections', async () => {
            ohanaShared.getUserAndTenantIdsFromDeviceId.mockResolvedValueOnce({
                userId: '123',
                tenantId: '0000'
            });
            ohanaShared.getTenantShortCode.mockResolvedValueOnce('0000');
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(false);
            ohanaShared.getChatReadReceiptsSubscriptionId.mockResolvedValueOnce(1);
            await unWatchConnectionReadReceipts('123-123');
            expect(ohanaShared.unWatchReadReceipt).toHaveBeenCalled();
        });

        test('then we call the function for closing all subscriptions if there are no more open connections', async () => {
            ohanaShared.getUserAndTenantIdsFromDeviceId.mockResolvedValueOnce({
                userId: '123',
                tenantId: '0000'
            });
            ohanaShared.getTenantShortCode.mockResolvedValueOnce('0000');
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(false);
            await unWatchConnectionReadReceipts('123-123');
            expect(ohanaShared.unWatchAllChatSubscriptions).toHaveBeenCalled();
        });
    });
});
