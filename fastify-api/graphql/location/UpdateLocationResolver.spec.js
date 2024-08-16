let resolver = null;

beforeEach(() => {
    resolver = require('./UpdateLocationResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateLocation: jest.fn(() => {
            return {
                id: '1',
                label: 'ICU'
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./UpdateLocationResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to update a location', () => {
    describe('when input is provided', () => {
        test('then it should return the updated location', async () => {
            const result = await resolver(
                null,
                {
                    location: {
                        id: 1,
                        label: 'ICU'
                    }
                },
                {tenantId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '1',
                    label: 'ICU'
                })
            );
        });
    });
});
