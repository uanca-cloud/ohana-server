let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./AssignCaregiverToPatientResolver');
    ohanaSharedPackage = require('ohana-shared');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared/constants'),
            DISABLE_CSA_INTEGRATION: false
        },
        assignUserToPatient: jest.fn(() => {
            return {
                id: '1111',
                externalId: '22224444',
                externalIdType: 'mrn',
                firstName: 'john',
                lastName: 'doe',
                dateOfBirth: '1991-03-15',
                location: {
                    id: '2',
                    label: 'RMN'
                },
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            };
        }),
        hasOpenEncounter: jest.fn(() => true),
        createAuditEvent: jest.fn(() => true),
        writeLog: jest.fn(() => {}),
        isUserMappedToPatient: jest.fn(() => true),
        insertSessionMappedPatientByIds: jest.fn(),
        addChatMembers: jest.fn(() => Promise.resolve('test'))
    }));
});

afterEach(() => {
    jest.unmock('./AssignCaregiverToPatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to add a new user to a patient', () => {
    describe('when input is provided  and new patient is added to the mapped patient list', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    patientId: 1111,
                    encounterId: 1
                },
                {userId: 1, mappedPatients: []}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '1111',
                    externalId: '22224444',
                    externalIdType: 'mrn',
                    firstName: 'john',
                    lastName: 'doe',
                    dateOfBirth: '1991-03-15',
                    location: {
                        id: '2',
                        label: 'RMN'
                    }
                })
            );
            expect(ohanaSharedPackage.insertSessionMappedPatientByIds).toBeCalledTimes(0);
            expect(ohanaSharedPackage.addChatMembers).toBeCalledTimes(1);
        });
    });

    describe('when input is provided and patient has already been added to the mappedPatient', () => {
        test('then it should return true', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => false);
            const result = await resolver(
                null,
                {
                    patientId: 1111,
                    encounterId: 1
                },
                {userId: 1, mappedPatients: [1]}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '1111',
                    externalId: '22224444',
                    externalIdType: 'mrn',
                    firstName: 'john',
                    lastName: 'doe',
                    dateOfBirth: '1991-03-15',
                    location: {
                        id: '2',
                        label: 'RMN'
                    }
                })
            );
            expect(ohanaSharedPackage.insertSessionMappedPatientByIds).toBeCalledTimes(1);
        });
    });

    describe('when the encounter was closed', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => false);

            resolver(
                null,
                {
                    patientId: 1111,
                    encounterId: 1
                },
                {userId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });

    describe('When the patient cannot be assigned to a caregiver', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.assignUserToPatient.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    patientId: 1111,
                    encounterId: 1
                },
                {userId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.message).toBe('Unable to assign caregiver to patient');
                });
        });
    });
});
