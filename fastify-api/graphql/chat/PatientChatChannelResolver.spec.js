let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        getPatientChatInformationByIdAndUserId: jest.fn(() =>
            Promise.resolve({
                patientId: 1,
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                enableChat: true,
                location: {
                    id: 1,
                    label: 'Test'
                },
                notificationLevel: 'mute'
            })
        ),
        getChatChannelInformation: jest.fn(() =>
            Promise.resolve({
                id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                seed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                notificationLevel: 'loud',
                initialChats: {
                    edges: [
                        {
                            node: {
                                id: '01HKA8YK4KBFBXBXZH1GXBKQNG',
                                order: 12,
                                text: 'test',
                                createdAt: '2024-02-22T13:33:57.155Z',
                                status: 'read',
                                sentBy: {
                                    identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234'
                                },
                                metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                            },
                            cursor: 'order:12'
                        }
                    ],
                    unreadCount: 1
                }
            })
        ),
        getChatUserInfoById: jest.fn(() =>
            Promise.resolve({
                id: '1234',
                role: 'ApprovedUser',
                assignedRoles: ['ApprovedUser'],
                firstName: 'John',
                lastName: 'Doe',
                title: 'Nurse',
                patientRelationship: null
            })
        ),
        getLocationSetting: jest.fn(() => ({key: 'chatLocationEnabled', value: 'true'}))
    }));

    resolver = require('./PatientChatChannelResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to retrieve the chat history for a patient', () => {
    describe('When valid input is provided', () => {
        describe('When patient has an open chat channel', () => {
            test('Then it should return the chat channel', async () => {
                const result = await resolver(
                    null,
                    {patientId: 1},
                    {
                        tenantId: '1234-abc',
                        userId: '123',
                        mappedPatients: [1],
                        tenantShortCode: '0000'
                    }
                );

                expect(result).toStrictEqual({
                    patientId: 1,
                    unreadChatMessageCount: 1,
                    chatLocationEnabled: true,
                    chatPatientEnabled: true,
                    notificationLevel: 'loud',
                    lastChat: {
                        id: '01HKA8YK4KBFBXBXZH1GXBKQNG',
                        order: 12,
                        cursor: 'order:12',
                        text: 'test',
                        createdAt: '2024-02-22T13:33:57.155Z',
                        status: 'read',
                        metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}',
                        sentBy: {
                            userId: '1234',
                            role: 'ApprovedUser',
                            firstName: 'John',
                            lastName: 'Doe',
                            title: 'Nurse',
                            patientRelationship: null
                        }
                    }
                });
            });
        });

        describe('When patient does not have an open chat channel', () => {
            test('Then it should return the chat channel with default values', async () => {
                ohanaSharedPackage.getPatientChatInformationByIdAndUserId.mockImplementationOnce(
                    () =>
                        Promise.resolve({
                            patientId: 1,
                            enableChat: true,
                            location: {
                                id: 1,
                                label: 'Test'
                            },
                            notificationLevel: 'mute'
                        })
                );

                const result = await resolver(
                    null,
                    {patientId: 1},
                    {
                        tenantId: '1234-abc',
                        userId: '123',
                        mappedPatients: [1],
                        tenantShortCode: '0000'
                    }
                );

                expect(result).toStrictEqual({
                    patientId: 1,
                    unreadChatMessageCount: 0,
                    chatLocationEnabled: true,
                    chatPatientEnabled: true,
                    notificationLevel: 'mute',
                    lastChat: null
                });
            });
        });

        describe('When initialChats returned by chat is empty', () => {
            test('Then it should return the chat channel with default values', async () => {
                ohanaSharedPackage.getChatChannelInformation.mockImplementationOnce(() =>
                    Promise.resolve({
                        id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                        seed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                        notificationLevel: 'loud',
                        initialChats: {
                            edges: [],
                            unreadCount: 1
                        }
                    })
                );

                const result = await resolver(
                    null,
                    {patientId: 1},
                    {
                        tenantId: '1234-abc',
                        userId: '123',
                        mappedPatients: [1],
                        tenantShortCode: '0000'
                    }
                );

                expect(result).toStrictEqual({
                    patientId: 1,
                    unreadChatMessageCount: 1,
                    chatLocationEnabled: true,
                    chatPatientEnabled: true,
                    notificationLevel: 'loud',
                    lastChat: null
                });
            });
        });
    });

    describe('When no open encounter exists for that patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

            resolver(
                null,
                {patientId: 1},
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
                {patientId: 1},
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
});
