let resolver = null;

beforeEach(() => {
    resolver = require('./LocationQuickMessagesResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getLocationQuickMessages: jest.fn(() => {
            return [
                {
                    messageId: '8',
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
                {
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
                },
                {
                    messageId: '10',
                    quickMessages: [
                        {
                            text: 'Smth 24',
                            locale: 'en_US'
                        },
                        {
                            text: 'Smth 25',
                            locale: 'en_GB'
                        }
                    ]
                }
            ];
        })
    }));
});

afterEach(() => {
    jest.unmock('./LocationQuickMessagesResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to fetch location specific quick messages', () => {
    describe('when location id is provided', () => {
        test('then it should return the quick message list', async () => {
            const result = await resolver(
                null,
                {
                    locationId: 1
                },
                {userId: 1, tenantId: 1}
            );

            expect(result).toEqual([
                {
                    messageId: '8',
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
                {
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
                },
                {
                    messageId: '10',
                    quickMessages: [
                        {
                            text: 'Smth 24',
                            locale: 'en_US'
                        },
                        {
                            text: 'Smth 25',
                            locale: 'en_GB'
                        }
                    ]
                }
            ]);
        });
    });
});
