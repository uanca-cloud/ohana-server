let resolver = null,
    ohanaSharedPackage = null;
const context = {
    mappedPatients: [1],
    tenantShortCode: '0000',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ApprovedUser',
    deviceId: '1234567890',
    tenantId: 'e046f32e-f97c-eb11-9889-',
    userId: 'e671b4a5-8147-423c-b7cf',
    osVersion: '12',
    buildNumber: '0101',
    deviceModel: 'Android',
    deviceName: '',
    email: null,
    title: 'RN',
    patientRelationship: 'Parent'
};
const expectedResult = {
    id: 1,
    order: 1,
    text: 'test',
    sentBy: {
        userId: 'e671b4a5-8147-423c-b7cf',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ApprovedUser',
        patientRelationship: 'Parent',
        title: 'RN'
    },
    createdAt: new Date('2024-01-08T00:00:00.000Z'),
    status: 'created',
    metadata:
        '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234", "senderDeviceId": "1234567890"}}',
    cursor: 'order:1'
};
beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        addPatientChatChannelInformation: jest.fn(() =>
            Promise.resolve({
                patientId: 1,
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            })
        ),
        getPatientById: jest.fn(() =>
            Promise.resolve({
                patientId: 1,
                id: 1,
                externalId: 'OHS-123',
                location: {id: 1111, label: 'NICU-1'},
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            })
        ),
        getUserIdsLinkedToPatient: jest.fn(() => Promise.resolve(['123456'])),
        createChatChannel: jest.fn(() => Promise.resolve()),
        getPreferredLanguage: jest.fn(() => Promise.resolve('English')),
        getFamilyMember: jest.fn(() =>
            Promise.resolve({
                userId: '832ad522-2eb6-4f18-894d-ef2a375ce342',
                patientId: 5,
                tenantId: 'e046f32e-f97c-eb11-9889-00155d03ff5d',
                assignedRoles: ['FamilyMember'],
                role: 'FamilyMember',
                firstName: 'Dandre',
                lastName: 'Gerlach',
                phoneNumber: '272.412.5225',
                patientRelationship: 'Parent',
                preferredLocale: 'zh_TW',
                primary: true,
                invitedBy: {
                    id: 'e671b4a5-8147-423c-b7cf-3fddb508767b',
                    tenant: {
                        id: 'e046f32e-f97c-eb11-9889-00155d03ff5d'
                    },
                    role: 'ApprovedUser',
                    title: 'RN',
                    firstName: 'Josh',
                    lastName: 'Doe',
                    acceptedEula: false,
                    renewEula: false
                },
                createdAt: '2024-05-23T20:42:53.153Z',
                acceptedEula: false,
                eulaAcceptTimestamp: null,
                mappedPatients: [5],
                isPatient: false
            })
        ),
        sendChatMessage: jest.fn(() =>
            Promise.resolve({
                id: 1,
                order: 1,
                text: 'test',
                sentBy: {
                    userId: 'e671b4a5-8147-423c-b7cf',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ApprovedUser'
                },
                createdAt: new Date('2024-01-08T00:00:00.000Z'),
                status: 'created',
                metadata:
                    '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234", "senderDeviceId": "1234567890"}}',
                cursor: null
            })
        ),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        isChatEnabled: jest.fn(() => Promise.resolve(true)),
        createAuditEvent: jest.fn(() => Promise.resolve(true)),
        getUserData: jest.fn(() =>
            Promise.resolve({
                userId: 'e671b4a5-8147-423c-b7cf',
                firstName: 'John',
                lastName: 'Doe',
                role: 'FamilyMember',
                title: 'RN',
                patientRelationship: 'Parent'
            })
        ),
        updateChatNotificationLevel: jest.fn(() => Promise.resolve(true))
    }));

    resolver = require('./SendChatMessageResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.resetAllMocks();
    jest.resetModules();
});

describe('Given we want to resolve the sendChatMessage mutation to send messages in a chat', () => {
    describe('When valid input is provided', () => {
        describe('When chat channel was already created', () => {
            describe('When user role is a Family Member', () => {
                test('then it should return the chat message and not call createChatChannel', async () => {
                    context.role = 'FamilyMember';
                    expectedResult.sentBy.role = 'FamilyMember';
                    const result = await resolver(
                        null,
                        {
                            input: {
                                patientId: 1,
                                text: 'test',
                                metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                            }
                        },
                        context
                    );

                    expect(result).toEqual(expect.objectContaining(expectedResult));
                    expect(ohanaSharedPackage.getPreferredLanguage).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.getFamilyMember).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.createChatChannel).toHaveBeenCalledTimes(0);
                });
            });

            describe('When user role is a Caregiver', () => {
                test('then it should return the chat message and not call createChatChannel', async () => {
                    context.role = 'ApprovedUser';
                    expectedResult.sentBy.role = 'ApprovedUser';
                    const result = await resolver(
                        null,
                        {
                            input: {
                                patientId: 1,
                                text: 'test',
                                metadata: '{"1.2.3.4.5.6.1234.1.2.3": {"mobileMessageId": "1234"}}'
                            }
                        },
                        context
                    );

                    expect(result).toEqual(expect.objectContaining(expectedResult));
                    expect(ohanaSharedPackage.createChatChannel).toHaveBeenCalledTimes(0);
                });
            });
        });

        describe('When chat channel was not created', () => {
            test('then it should return the chat message and call createChatChannel', async () => {
                ohanaSharedPackage.getPatientById.mockImplementation(() =>
                    Promise.resolve({
                        id: 1,
                        externalId: 'OHS-123',
                        location: {id: 1111, label: 'NICU-1'}
                    })
                );
                const result = await resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        }
                    },
                    context
                );

                expect(result).toEqual(expect.objectContaining(expectedResult));
                expect(ohanaSharedPackage.createChatChannel).toHaveBeenCalledTimes(1);
            });
        });

        describe('when there is no metadata sent', () => {
            test('then it should add the device id in the metadata', async () => {
                const result = await resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test'
                        }
                    },
                    context
                );

                expect(result).toEqual(expectedResult);
                expect(ohanaSharedPackage.sendChatMessage).toHaveBeenCalledWith(
                    '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                    '0000',
                    'e671b4a5-8147-423c-b7cf',
                    'test',
                    `{"${ohanaSharedPackage.CONSTANTS.CSA_PRODUCT_OID}":{"senderDeviceId":"1234567890"}}`
                );
            });
        });

        describe('When user is not mapped to patient', () => {
            test('then it should throw an error FORBIDDEN', async () => {
                ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => null);
                resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        }
                    },
                    context
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('FORBIDDEN');
                    });
            });
        });

        describe('When no open encounter exists for that patient', () => {
            test('then it should throw an error NOT_FOUND', async () => {
                ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        }
                    },
                    context
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('NOT_FOUND');
                    });
            });
        });

        describe('When chat is not enabled for a patient or their location', () => {
            test('then it should throw an error CHAT_DISABLED_ERROR', async () => {
                ohanaSharedPackage.isChatEnabled.mockImplementationOnce(() => false);

                resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        }
                    },
                    context
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('CHAT_DISABLED_ERROR');
                    });
            });
        });

        describe('When user is Family Member and the chat channel was not started', () => {
            test('then it should throw an error NOT_FOUND', async () => {
                context.role = 'FamilyMember';
                ohanaSharedPackage.getPatientById.mockImplementationOnce(() =>
                    Promise.resolve({
                        patientId: 1,
                        patientUlid: null
                    })
                );

                resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            text: 'test',
                            metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                        }
                    },
                    context
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
});
