let resolver = null;

beforeEach(() => {
    resolver = require('./DeleteLocationQuickMessageResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        deleteLocationQuickMessage: jest.fn(() => true)
    }));
});

afterEach(() => {
    jest.unmock('./DeleteLocationQuickMessageResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to fetch caregiver quick messages', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    messageId: 1
                },
                {userId: 1, tenantId: 1}
            );

            expect(result).toEqual(true);
        });
    });
});
