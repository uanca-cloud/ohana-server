let resolver = null;
beforeEach(() => {
    resolver = require('./QuickMessagesByPatientResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getQuickMessagesByPatient: jest.fn(() => {
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
                }
            ];
        })
    }));
});

afterEach(() => {
    jest.unmock('./QuickMessagesByPatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to fetch quick messages for a patient', () => {
    describe('when input is provided', () => {
        describe('and app version is 1.7.0', () => {
            test('then it should return the quick messages', async () => {
                const result = await resolver(
                    null,
                    {
                        patientId: 1
                    },
                    {userId: 1, tenantId: 1, version: '1.7.0'}
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
                    }
                ]);
            });
        });
    });
});
