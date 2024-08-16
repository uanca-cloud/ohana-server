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
const expectedResult = [
    {
        order: 1,
        text: 'test',
        sentBy: {
            userId: '1234',
            firstName: 'John',
            lastName: 'Doe',
            role: 'ApprovedUser',
            title: 'Nurse',
            patientRelationship: undefined
        },
        createdAt: new Date('2024-03-26T00:00:00.000Z').toISOString(),
        status: 'read',
        metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}',
        cursor: null,
        id: '1'
    },
    {
        order: 2,
        text: 'test',
        sentBy: {
            userId: '1234',
            firstName: 'John',
            lastName: 'Doe',
            role: 'ApprovedUser',
            title: 'Nurse',
            patientRelationship: undefined
        },
        createdAt: new Date('2024-03-26T00:00:00.000Z').toISOString(),
        status: 'read',
        metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}',
        cursor: null,
        id: '2'
    }
];
beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        markChatMessagesAsRead: jest.fn(() =>
            Promise.resolve([
                {
                    id: '1',
                    order: 1,
                    text: 'test',
                    sentBy: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234',
                    createdAt: new Date('2024-03-26T00:00:00.000Z').toISOString(),
                    status: 'read',
                    metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                },
                {
                    id: '2',
                    order: 2,
                    text: 'test',
                    sentBy: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234',
                    createdAt: new Date('2024-03-26T00:00:00.000Z').toISOString(),
                    status: 'read',
                    metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                }
            ])
        ),
        getUsersByIds: jest.fn(() =>
            Promise.resolve([
                {
                    id: '1234',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    title: 'Nurse'
                }
            ])
        ),
        extractOhanaId: jest.fn(() => '1234'),
        createAuditEvent: jest.fn(() => Promise.resolve(true)),
        getPatientById: jest.fn(() => {
            return {
                id: '1',
                externalId: 'MRN1',
                externalIdType: 'MRN',
                firstName: 'Test',
                lastName: 'Test',
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            };
        }),
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
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true))
    }));

    resolver = require('./MarkChatMessagesAsReadResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve the markChatMessagesAsRead mutation', () => {
    describe('When valid input is provided', () => {
        describe('When user role is a Family Member', () => {
            test('Then it should return the list of messages marked as read', async () => {
                context.role = 'FamilyMember';
                const result = await resolver(
                    null,
                    {input: {patientId: 1, orderNumbers: [1, 2]}},
                    context
                );
                expect(result).toStrictEqual(expectedResult);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
                expect(ohanaSharedPackage.getFamilyMember).toHaveBeenCalledTimes(1);
            });
        });
        describe('When user role is a Care Giver', () => {
            test('Then it should return the list of messages marked as read', async () => {
                context.role = 'ApprovedUser';
                const result = await resolver(
                    null,
                    {input: {patientId: 1, orderNumbers: [1, 2]}},
                    context
                );
                expect(result).toStrictEqual(expectedResult);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
                expect(ohanaSharedPackage.getFamilyMember).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('When patient has no active encounter', () => {
        test('then it should throw an error NOT_FOUND', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => false);

            resolver(null, {input: {patientId: 1, orderNumbers: [1, 2]}}, context)
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });

    describe('When user is not mapped to patient', () => {
        test('then it should throw an error FORBIDDEN', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => false);

            resolver(
                null,
                {input: {patientId: 1, orderNumbers: [1, 2]}},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('When patient has no active chat channel', () => {
        test('then it should throw an error NOT_FOUND', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() => {});

            resolver(
                null,
                {input: {patientId: 1, orderNumbers: [1, 2]}},
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
});
