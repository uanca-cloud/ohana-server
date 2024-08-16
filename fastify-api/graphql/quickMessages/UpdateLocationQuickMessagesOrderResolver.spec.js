let resolver = null;

beforeEach(() => {
    resolver = require('./UpdateLocationQuickMessagesOrderResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateLocationQuickMessagesOrder: jest.fn(() => {
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
                    ],
                    messageOrder: 1
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
                    ],
                    messageOrder: 2
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
                    ],
                    messageOrder: 3
                }
            ];
        })
    }));
});

afterEach(() => {
    jest.unmock('./UpdateLocationQuickMessagesOrderResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to update the order of location quick messages', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    locationId: 1,
                    quickMessagesOrder: [
                        {id: 8, messageOrder: 1},
                        {id: 9, messageOrder: 2}
                    ]
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
                    ],
                    messageOrder: 1
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
                    ],
                    messageOrder: 2
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
                    ],
                    messageOrder: 3
                }
            ]);
        });
    });
});
