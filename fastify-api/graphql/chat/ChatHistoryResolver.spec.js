let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        getPatientById: jest.fn(() =>
            Promise.resolve({
                patientId: 1,
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            })
        ),
        getChatHistory: jest.fn(() =>
            Promise.resolve({
                unreadCount: 2,
                edges: [
                    {
                        node: {
                            id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                            channelSeed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                            order: 213240,
                            sentBy: {
                                id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                                identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234',
                                metadata: null
                            },
                            createdAt: '2024-01-25T09:40:20.970Z',
                            text: 'test',
                            attachments: [],
                            priority: 'normal',
                            status: 'created',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        },
                        cursor: 'order:213240'
                    }
                ],
                pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: 'order:213240',
                    endCursor: 'order:213240',
                    totalCount: 3,
                    offset: null,
                    continuationToken: null
                }
            })
        ),
        getUsersByIds: jest.fn(() =>
            Promise.resolve([
                {
                    id: '1234',
                    role: 'ApprovedUser',
                    assignedRoles: ['ApprovedUser'],
                    firstName: 'John',
                    lastName: 'Doe',
                    title: 'Nurse',
                    patientRelationship: null
                }
            ])
        )
    }));

    resolver = require('./ChatHistoryResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to retrieve the chat history for a patient', () => {
    describe('When valid input is provided', () => {
        test('Then it should return the history', async () => {
            const result = await resolver(
                null,
                {patientId: 1, limit: 10, cursor: 'order:213241'},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            );

            expect(result).toStrictEqual({
                chatHistory: {
                    pageInfo: {
                        hasNextPage: false,
                        hasPreviousPage: false,
                        startCursor: 'order:213240',
                        endCursor: 'order:213240',
                        totalCount: 3,
                        offset: null,
                        continuationToken: null
                    },
                    unreadCount: 2,
                    edges: [
                        {
                            cursor: 'order:213240',
                            node: {
                                sentBy: {
                                    userId: '1234',
                                    role: 'ApprovedUser',
                                    firstName: 'John',
                                    lastName: 'Doe',
                                    title: 'Nurse',
                                    patientRelationship: null
                                },
                                status: 'created',
                                text: 'test',
                                attachments: [],
                                channelSeed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                                createdAt: '2024-01-25T09:40:20.970Z',
                                id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                                metadata:
                                    '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}',
                                order: 213240,
                                priority: 'normal',
                                cursor: 'order:213240'
                            }
                        }
                    ]
                }
            });
        });
    });

    describe('When no open encounter exists for that patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

            resolver(
                null,
                {patientId: 1, limit: 10, cursor: 'order:213241'},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });

    describe('When user is not mapped to patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => null);

            resolver(
                null,
                {patientId: 1, limit: 10, cursor: 'order:213241'},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('When channel was not created for this patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() =>
                Promise.resolve({
                    patientId: 1,
                    patientUlid: null
                })
            );

            resolver(
                null,
                {patientId: 1, limit: 10, cursor: 'order:213241'},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });
});
