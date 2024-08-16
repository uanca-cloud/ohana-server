let resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapServiceBusService: jest.fn(() => {}),
        pushMessageInQueue: jest.fn(() => true),
        updateLocationFixedContentsOrder: jest.fn(() => {
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
        }),
        writeLog: jest.fn(() => {})
    }));

    resolver = require('./UpdateLocationFixedContentsReorderResolver');
});

afterEach(() => {
    jest.unmock('./UpdateLocationFixedContentsReorderResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to delete a location fixed content', () => {
    describe('when valid input is provided', function () {
        test('then it should return "true"', async () => {
            const result = await resolver(
                null,
                {
                    locationId: 1,
                    fixedContent: {
                        title: 'Yahoo',
                        url: 'http://www.yahoo.com'
                    }
                },
                {userId: 1, tenantId: 1}
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
        });
    });
});
