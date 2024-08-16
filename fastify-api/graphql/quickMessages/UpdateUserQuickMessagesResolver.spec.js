let resolver = null;

beforeEach(() => {
    resolver = require('./UpdateUserQuickMessagesResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateUserQuickMessages: jest.fn(() => {
            return ['Hello there', 'Hello sir'];
        })
    }));
});

afterEach(() => {
    jest.unmock('./UpdateUserQuickMessagesResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to upsert caregiver quick messages', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    quickMessages: ['Hello there', 'Hello sir']
                },
                {userId: 1}
            );

            expect(result).toEqual(['Hello there', 'Hello sir']);
        });
    });
});
