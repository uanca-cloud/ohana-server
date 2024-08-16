let resolver = null;

beforeEach(() => {
    resolver = require('./CreateLocationResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        createLocation: jest.fn(() => {
            return {
                id: '1',
                label: 'ICU'
            };
        }),
        writeLog: jest.fn(() => {})
    }));
});

afterEach(() => {
    jest.unmock('./CreateLocationResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to add a new location', () => {
    describe('when input is provided', () => {
        test('then it should return the new location', async () => {
            const result = await resolver(
                null,
                {
                    location: {
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
