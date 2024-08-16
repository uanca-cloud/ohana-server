let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./FixedContentsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getAllLocationFixedContents: jest.fn(() => {
            return [
                {
                    id: 1,
                    title: 'Google',
                    url: 'http://www.google.com',
                    order: 1
                },
                {
                    id: 2,
                    title: 'Yahoo',
                    url: 'http://www.yahoo.com',
                    order: 2
                },
                {
                    id: 3,
                    title: 'Bing',
                    url: 'http://www.bing.com',
                    order: 3
                }
            ];
        })
    }));

    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./LocationFixedContentsResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to fetch fixed contents', () => {
    test('then it should return the fixed content', async () => {
        const result = await resolver(
            null,
            {
                locationId: 1
            },
            {tenantId: 1}
        );

        expect(result).toEqual([
            {
                id: 1,
                title: 'Google',
                url: 'http://www.google.com',
                order: 1
            },
            {
                id: 2,
                title: 'Yahoo',
                url: 'http://www.yahoo.com',
                order: 2
            },
            {
                id: 3,
                title: 'Bing',
                url: 'http://www.bing.com',
                order: 3
            }
        ]);
        expect(ohanaSharedPackage.getAllLocationFixedContents).toHaveBeenCalledTimes(1);
    });
});
