let resolver = null;

beforeEach(() => {
    resolver = require('./LocationsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getLocationList: jest.fn(() => {
            return [
                {
                    id: '1',
                    label: 'ICU'
                },
                {id: '2', label: 'RMN'}
            ];
        })
    }));
});

afterEach(() => {
    jest.unmock('./LocationsResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get all locations', () => {
    describe('when input is provided', () => {
        test('then it should return the locations', async () => {
            const result = await resolver(null, {}, {tenantId: 1});

            expect(result).toEqual([
                {
                    id: '1',
                    label: 'ICU'
                },
                {id: '2', label: 'RMN'}
            ]);
        });
    });
});
