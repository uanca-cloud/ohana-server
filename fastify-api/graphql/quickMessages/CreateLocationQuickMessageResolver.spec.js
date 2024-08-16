let resolver = null;

beforeEach(() => {
    resolver = require('./CreateLocationQuickMessageResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        createLocationQuickMessage: jest.fn(() => {
            return {
                messageId: '9',
                quickMessages: [
                    {
                        text: 'Smth 6',
                        locale: 'en_US'
                    },
                    {
                        text: 'Smth 6',
                        locale: 'en_GB'
                    }
                ]
            };
        }),
        createSiteWideQuickMessage: jest.fn(() => {
            return {
                messageId: '9',
                quickMessages: [
                    {
                        text: 'Smth 6',
                        locale: 'en_US'
                    },
                    {
                        text: 'Smth 6',
                        locale: 'en_GB'
                    }
                ]
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./CreateLocationQuickMessageResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to fetch caregiver quick messages', () => {
    describe('when location id is provided', () => {
        test('then it should return the created quick message', async () => {
            const result = await resolver(
                null,
                {
                    locationId: 1,
                    quickMessages: [
                        {
                            text: 'Smth 3',
                            locale: 'en_US'
                        },
                        {
                            text: 'Smth 4',
                            locale: 'en_GB'
                        }
                    ]
                },
                {userId: 1, tenantId: 1}
            );

            expect(result).toEqual({
                messageId: '9',
                quickMessages: [
                    {
                        text: 'Smth 6',
                        locale: 'en_US'
                    },
                    {
                        text: 'Smth 6',
                        locale: 'en_GB'
                    }
                ]
            });
        });
    });

    describe('when location id is not provided', () => {
        test('then it should return the created quick message', async () => {
            const result = await resolver(
                null,
                {
                    quickMessages: [
                        {
                            text: 'Smth 3',
                            locale: 'en_US'
                        },
                        {
                            text: 'Smth 4',
                            locale: 'en_GB'
                        }
                    ]
                },
                {userId: 1, tenantId: 1}
            );

            expect(result).toEqual({
                messageId: '9',
                quickMessages: [
                    {
                        text: 'Smth 6',
                        locale: 'en_US'
                    },
                    {
                        text: 'Smth 6',
                        locale: 'en_GB'
                    }
                ]
            });
        });
    });
});
