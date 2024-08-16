let createSocket;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        sendToConnection: jest.fn()
    }));

    createSocket = require('./AzureWebPubSubSocket');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to test the WS object creation', () => {
    describe('When we create a WS object', () => {
        test("then it doesn't have ping/pong enabled by default", async () => {
            const socket = await createSocket({}, 'connection-id', false);
            expect(socket.onPong).toBeUndefined();
        });

        test('then it has ping and pong if enabled', async () => {
            const socket = await createSocket({}, 'connection-id', true);
            expect(socket.onPong).toBeDefined();
        });
    });
});
