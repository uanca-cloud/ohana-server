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
        getChatMembers: jest.fn(() =>
            Promise.resolve({
                edges: [
                    {
                        node: {
                            id: '1',
                            identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:1',
                            metadata:
                                '{"1.3.6.1.4.1.50624.1.2.6": "{\\"familyMember\\": \\"false\\"}}"}',
                            active: true
                        },
                        cursor: 'order:213240'
                    },
                    {
                        node: {
                            id: '2',
                            identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:2',
                            metadata:
                                '{"1.3.6.1.4.1.50624.1.2.6": "{\\"familyMember\\": \\"true\\"}}"}',
                            active: false
                        },
                        cursor: 'order:213240'
                    },
                    {
                        node: {
                            id: '3',
                            identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:3',
                            metadata:
                                '{"1.3.6.1.4.1.50624.1.2.6": "{\\"familyMember\\": \\"false\\"}}"}',
                            active: false
                        },
                        cursor: 'order:213240'
                    },
                    {
                        node: {
                            id: '4',
                            identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                            metadata: null,
                            active: false
                        },
                        cursor: 'order:213240'
                    }
                ],
                pageInfo: {
                    hasNextPage: false,
                    startCursor: 'order:213240',
                    endCursor: 'order:213240',
                    totalCount: 4,
                    offset: 0
                }
            })
        ),
        createUserDictionary: jest.fn(() => {
            const map = new Map();
            map.set('1', {
                id: '1',
                firstName: 'John1',
                lastName: 'Doe1',
                role: 'ApprovedUser',
                title: 'Nurse',
                patientRelationship: null
            });
            map.set('2', {
                id: '2',
                firstName: 'John2',
                lastName: 'Doe2',
                role: 'FamilyMember',
                title: null,
                patientRelationship: 'Sibling'
            });
            map.set('3', {
                id: '3',
                firstName: 'John3',
                lastName: 'Doe3',
                role: 'ApprovedUser',
                title: 'Nurse',
                patientRelationship: null
            });
            return map;
        })
    }));

    resolver = require('./ChatMembersResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to retrieve the chat members for a patient', () => {
    describe('When valid input is provided', () => {
        test('Then it should return the chatMembers', async () => {
            const result = await resolver(
                null,
                {patientId: 1, limit: 10, offset: 0},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            );

            expect(result).toStrictEqual({
                pageInfo: {
                    hasNextPage: false,
                    startCursor: 'order:213240',
                    endCursor: 'order:213240',
                    totalCount: 4,
                    offset: 0
                },
                edges: [
                    {
                        cursor: 'order:213240',
                        node: {
                            userId: '1',
                            role: 'ApprovedUser',
                            firstName: 'John1',
                            lastName: 'Doe1',
                            title: 'Nurse',
                            patientRelationship: null
                        }
                    },
                    {
                        cursor: 'order:213240',
                        node: {
                            userId: '2',
                            role: 'FamilyMember',
                            firstName: 'John2',
                            lastName: 'Doe2',
                            title: null,
                            patientRelationship: 'Sibling'
                        }
                    }
                ]
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
