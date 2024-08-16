let resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        generateUrl: jest.fn(() => 'test_url')
    }));

    resolver = require('./GetWebSocketUrlResolver');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to generate a WS URL', () => {
    describe('When the URL is generated', () => {
        test('then it should return the URL', async () => {
            const result = await resolver(null, null, {
                deviceId: '1234',
                userId: '123456'
            });

            expect(result).toEqual({url: 'test_url'});
        });
    });
});
