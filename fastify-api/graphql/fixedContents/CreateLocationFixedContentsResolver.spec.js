let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapServiceBusService: jest.fn(() => {}),
        pushMessageInQueue: jest.fn(() => true),
        createLocationFixedContent: jest.fn(() => ({
            id: '1',
            title: 'Google',
            url: 'http://www.google.com',
            order: 1
        })),
        createSiteWideFixedContent: jest.fn(() => ({
            id: '1',
            title: 'Google',
            url: 'http://www.google.com',
            order: 1
        })),
        writeLog: jest.fn(() => {})
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CreateLocationFixedContentResolver');
});

afterEach(() => {
    jest.unmock('./CreateLocationFixedContentResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to create a location fixed content', () => {
    describe('when a location id is provided', () => {
        test('then it should return the input value', async () => {
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
                id: '1',
                title: 'Google',
                url: 'http://www.google.com',
                order: 1
            });
            expect(ohanaSharedPackage.createLocationFixedContent).toHaveBeenCalledTimes(1);
        });
    });

    describe('when no location id is provided', () => {
        test('then it should return the input value', async () => {
            const result = await resolver(
                null,
                {
                    fixedContent: {
                        title: 'Yahoo',
                        url: 'http://www.yahoo.com'
                    }
                },
                {userId: 1, tenantId: 1}
            );

            expect(result).toEqual({
                id: '1',
                title: 'Google',
                url: 'http://www.google.com',
                order: 1
            });
            expect(ohanaSharedPackage.createSiteWideFixedContent).toHaveBeenCalledTimes(1);
        });
    });
});
