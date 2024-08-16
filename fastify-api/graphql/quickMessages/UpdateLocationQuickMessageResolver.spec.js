let resolver = null;

beforeEach(() => {
    resolver = require('./UpdateLocationQuickMessageResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateLocationQuickMessage: jest.fn(() => {
            return {
                messageId: 25,
                quickMessages: [{text: 'Hello there', locale: 'en_US'}]
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./UpdateLocationQuickMessageResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to upsert admin quick messages', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    messageId: '1',
                    quickMessages: [{text: 'Hello there', locale: 'en_US'}]
                },
                {userId: 1}
            );

            expect(result).toEqual({
                messageId: 25,
                quickMessages: [{text: 'Hello there', locale: 'en_US'}]
            });
        });
    });
});
