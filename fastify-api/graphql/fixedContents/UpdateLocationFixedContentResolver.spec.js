let resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapServiceBusService: jest.fn(() => {}),
        pushMessageInQueue: jest.fn(() => true),
        updateLocationFixedContent: jest.fn(() => {
            return {
                id: null,
                title: 'Yahoo',
                url: 'http://www.yahoo.com'
            };
        }),
        writeLog: jest.fn(() => {})
    }));

    resolver = require('./UpdateLocationFixedContentResolver');
});

afterEach(() => {
    jest.unmock('./UpdateLocationFixedContentResolver');
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

            expect(result).toEqual({
                id: null,
                title: 'Yahoo',
                url: 'http://www.yahoo.com'
            });
        });
    });
});
