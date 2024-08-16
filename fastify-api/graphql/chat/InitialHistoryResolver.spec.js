let resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        initialHistory: jest.fn(() =>
            Promise.resolve({
                edges: [
                    {
                        node: {
                            seed: 'vf:patient:ulid1',
                            initialChats: {
                                edges: [
                                    {
                                        node: {
                                            id: '01HM6MD2ZGDV8MZMWWGDDPM5JK',
                                            order: 210930,
                                            text: 'test ohana',
                                            createdAt: '2024-01-15T13:19:03.669Z',
                                            status: 'read',
                                            sentBy: {
                                                identity:
                                                    'hrc:1.3.6.1.4.1.50624.1.2.6:8bd409a7-2a96-4b76-9263-abb8bc49eb99'
                                            },
                                            metadata:
                                                '{"hrc:1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": 1}}'
                                        },
                                        cursor: 'order:210930'
                                    }
                                ],
                                unreadCount: 0
                            },
                            notificationLevel: 'mute'
                        }
                    }
                ]
            })
        ),
        getPatientsByUser: jest.fn(() => [
            {
                id: 1,
                patientUlid: 'ulid1',
                firstName: 'Joy',
                lastName: 'Smith',
                enableChat: true,
                chatLocationEnabled: 'true',
                notificationLevel: 'mute'
            },
            {
                id: 2,
                patientUlid: 'ulid2',
                firstName: 'Bobby',
                lastName: 'Fake',
                enableChat: false,
                chatLocationEnabled: 'false',
                notificationLevel: 'loud'
            }
        ]),
        createUserDictionary: jest.fn(() => {
            const map = new Map();
            map.set('8bd409a7-2a96-4b76-9263-abb8bc49eb99', {
                id: '8bd409a7-2a96-4b76-9263-abb8bc49eb99',
                firstName: 'Bobby',
                lastName: 'Fake',
                assignedRoles: ['Administrator', 'ApprovedUser'],
                role: 'ApprovedUser'
            });
            return map;
        }),
        setRedisInitialChatCounts: jest.fn()
    }));

    resolver = require('./InitialHistoryResolver');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve the initialHistory query to get chat history', () => {
    describe('When a channel exists with a message', () => {
        test('then it should return the channel with the most recent message', async () => {
            const result = await resolver(null, null, {
                tenantId: '1234',
                userId: '123456',
                mappedPatients: [1],
                tenantShortCode: '0000',
                firstName: 'John',
                lastName: 'Doe',
                role: 'ApprovedUser'
            });

            expect(result).toEqual(
                expect.objectContaining({
                    patientChatChannels: [
                        {
                            patientId: 1,
                            unreadChatMessageCount: 0,
                            notificationLevel: 'mute',
                            lastChat: {
                                id: '01HM6MD2ZGDV8MZMWWGDDPM5JK',
                                order: 210930,
                                cursor: 'order:210930',
                                text: 'test ohana',
                                sentBy: {
                                    userId: '8bd409a7-2a96-4b76-9263-abb8bc49eb99',
                                    firstName: 'Bobby',
                                    lastName: 'Fake',
                                    role: 'ApprovedUser'
                                },
                                createdAt: '2024-01-15T13:19:03.669Z',
                                status: 'read',
                                metadata: '{"hrc:1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": 1}}'
                            },
                            chatPatientEnabled: true,
                            chatLocationEnabled: true
                        },
                        {
                            patientId: 2,
                            unreadChatMessageCount: 0,
                            notificationLevel: 'loud',
                            lastChat: null,
                            chatPatientEnabled: false,
                            chatLocationEnabled: false
                        }
                    ]
                })
            );
        });
    });
});
