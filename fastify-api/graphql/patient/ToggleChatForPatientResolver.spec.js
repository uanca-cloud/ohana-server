let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        publishPatientChatToggle: jest.fn(() => Promise.resolve()),
        updateChatEnabledToPatient: jest.fn(() => Promise.resolve({enableChat: true}))
    }));
    resolver = require('./ToggleChatForPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./ToggleChatForPatientResolver');
    jest.unmock('ohana-shared');
    jest.resetAllMocks();
});

describe('Given we want to resolve a GQL mutation to toggle chat for a patient', () => {
    describe('when user is mapped to patient', () => {
        describe('when updateChatEnabledToPatient does not throw an error', () => {
            test('then it should return with functions being called and true', async () => {
                const result = await resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            chatPatientEnabled: true
                        }
                    },
                    {
                        role: 'ApprovedUser',
                        userId: 1,
                        tenantId: 1,
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        mappedPatients: [2]
                    }
                );

                expect(ohanaSharedPackage.isUserMappedToPatient).toBeCalledTimes(1);
                expect(ohanaSharedPackage.updateChatEnabledToPatient).toBeCalledTimes(1);
                expect(ohanaSharedPackage.publishPatientChatToggle).toBeCalledTimes(1);
                expect(result).toEqual(true);
            });
        });

        describe('when updateChatEnabledToPatient throw an error', () => {
            test('then it should return with functions being called and true', async () => {
                ohanaSharedPackage.isUserMappedToPatient.mockImplementation(() =>
                    Promise.resolve(true)
                );
                ohanaSharedPackage.updateChatEnabledToPatient.mockImplementation(() =>
                    Promise.reject()
                );

                const result = await resolver(
                    null,
                    {
                        input: {
                            patientId: 1,
                            chatPatientEnabled: true
                        }
                    },
                    {
                        role: 'ApprovedUser',
                        userId: 1,
                        tenantId: 1,
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        mappedPatients: [1, 2]
                    }
                );

                expect(ohanaSharedPackage.isUserMappedToPatient).toBeCalledTimes(1);
                expect(ohanaSharedPackage.publishPatientChatToggle).toBeCalledTimes(0);
                expect(ohanaSharedPackage.updateChatEnabledToPatient).toBeCalledTimes(1);
                expect(result).toEqual(true);
            });
        });
    });

    describe('when user is not mapped to patient', () => {
        test('then it should throw an error', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementation(() =>
                Promise.resolve(false)
            );

            resolver(
                null,
                {
                    input: {
                        patientId: 1,
                        chatPatientEnabled: true
                    }
                },
                {
                    role: 'ApprovedUser',
                    userId: 1,
                    tenantId: 1,
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    mappedPatients: [2]
                }
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
