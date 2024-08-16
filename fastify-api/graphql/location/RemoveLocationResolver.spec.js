let resolver = null;

beforeEach(() => {
    resolver = require('./RemoveLocationResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        deleteLocation: jest.fn(() => true)
    }));
});

afterEach(() => {
    jest.unmock('./RemoveLocationResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to delete a location', () => {
    describe('when id of location is provided', () => {
        test('then it should true', async () => {
            const result = await resolver(null, {id: 1}, {tenantId: 1});

            expect(result).toBe(true);
        });
    });
});
