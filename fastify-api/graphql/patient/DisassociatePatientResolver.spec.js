let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared/constants'),
            DISABLE_CSA_INTEGRATION: false
        },
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        updateUserPatientMappingDeletedStatus: jest.fn(() => Promise.resolve(true)),
        removeSessionMappedPatientById: jest.fn(() => Promise.resolve({})),
        removeChatMembers: jest.fn(() => Promise.resolve({})),
        getPatientActiveEncountersById: jest.fn(() =>
            Promise.resolve({
                id: 1,
                locationId: 2,
                encounterIds: [111]
            })
        ),
        getPatientById: jest.fn(() => {
            return {
                id: 1,
                location: {id: 1, label: 'Surgery'}
            };
        }),
        createAuditEvent: jest.fn(() => Promise.resolve(true))
    }));

    resolver = require('./DisassociatePatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./DisassociatePatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to disassociate a patient', () => {
    describe('when an active encounter(s) exist', () => {
        describe('when user is mapped to patient', () => {
            describe('when there are mappings to update', () => {
                describe('when CSA integration is enable and an ulid is null on the patient', () => {
                    test('then it should return with functions being called and true', async () => {
                        ohanaSharedPackage.DISABLE_CSA_INTEGRATION = false;
                        ohanaSharedPackage.getPatientActiveEncountersById.mockImplementation(
                            () => ({
                                id: 1,
                                location: {id: 1, label: 'ER'},
                                patientUlid: null
                            })
                        );
                        const result = await resolver(
                            null,
                            {
                                patientId: 1
                            },
                            {
                                role: 'ApprovedUser',
                                userId: 1,
                                tenantId: 1,
                                deviceId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenantShortCode: '000K'
                            }
                        );
                        expect(
                            ohanaSharedPackage.updateUserPatientMappingDeletedStatus
                        ).toBeCalledTimes(1);
                        expect(ohanaSharedPackage.removeSessionMappedPatientById).toBeCalledTimes(
                            1
                        );
                        expect(ohanaSharedPackage.removeChatMembers).toBeCalledTimes(0);
                        expect(ohanaSharedPackage.createAuditEvent).toBeCalledTimes(1);
                        expect(result).toEqual(true);
                    });
                });
                describe('when CSA integration is disable and a ulid is present on the patient', () => {
                    test('then it should return with functions being called and true', async () => {
                        ohanaSharedPackage.DISABLE_CSA_INTEGRATION = true;
                        ohanaSharedPackage.getPatientActiveEncountersById.mockImplementation(
                            () => ({
                                id: 1,
                                location: {id: 1, label: 'ER'},
                                patientUlid: 'testUlid1'
                            })
                        );
                        const result = await resolver(
                            null,
                            {
                                patientId: 1
                            },
                            {
                                role: 'ApprovedUser',
                                userId: 1,
                                tenantId: 1,
                                deviceId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenantShortCode: '000K'
                            }
                        );

                        expect(
                            ohanaSharedPackage.updateUserPatientMappingDeletedStatus
                        ).toBeCalledTimes(1);
                        expect(ohanaSharedPackage.removeSessionMappedPatientById).toBeCalledTimes(
                            1
                        );
                        expect(ohanaSharedPackage.removeChatMembers).toBeCalledTimes(1);
                        expect(ohanaSharedPackage.createAuditEvent).toBeCalledTimes(1);
                        expect(result).toEqual(true);
                    });
                });
                describe('when CSA integration is enabled and an ulid exists on the patient', () => {
                    test('then it should return with functions being called and true', async () => {
                        ohanaSharedPackage.DISABLE_CSA_INTEGRATION = false;
                        ohanaSharedPackage.getPatientActiveEncountersById.mockImplementation(
                            () => ({
                                id: 1,
                                location: {id: 1, label: 'ER'},
                                patientUlid: 'testUlid1'
                            })
                        );
                        const result = await resolver(
                            null,
                            {
                                patientId: 1
                            },
                            {
                                role: 'ApprovedUser',
                                userId: 1,
                                tenantId: 1,
                                deviceId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenantShortCode: '000K'
                            }
                        );

                        expect(
                            ohanaSharedPackage.updateUserPatientMappingDeletedStatus
                        ).toBeCalledTimes(1);
                        expect(ohanaSharedPackage.removeSessionMappedPatientById).toBeCalledTimes(
                            1
                        );
                        expect(ohanaSharedPackage.removeChatMembers).toBeCalledTimes(1);
                        expect(ohanaSharedPackage.createAuditEvent).toBeCalledTimes(1);
                        expect(result).toEqual(true);
                    });
                });
            });
            describe('when there are no mappings to update', () => {
                test('then it should false', async () => {
                    ohanaSharedPackage.DISABLE_CSA_INTEGRATION = false;
                    ohanaSharedPackage.getPatientActiveEncountersById.mockImplementation(() => ({
                        id: 1,
                        location: {id: 1, label: 'ER'},
                        patientUlid: 'testUlid1'
                    }));
                    ohanaSharedPackage.updateUserPatientMappingDeletedStatus.mockImplementationOnce(
                        () => Promise.resolve(false)
                    );
                    ohanaSharedPackage.removeChatMembers.mockImplementationOnce(() =>
                        Promise.resolve(false)
                    );

                    const result = await resolver(
                        null,
                        {
                            patientId: 1
                        },
                        {
                            role: 'ApprovedUser',
                            userId: 1,
                            tenantId: 1,
                            deviceId: 1,
                            firstName: 'Vlad',
                            lastName: 'Doe'
                        }
                    );
                    expect(
                        ohanaSharedPackage.updateUserPatientMappingDeletedStatus
                    ).toBeCalledTimes(1);
                    expect(ohanaSharedPackage.removeSessionMappedPatientById).toBeCalledTimes(0);
                    expect(ohanaSharedPackage.removeChatMembers).toBeCalledTimes(0);
                    expect(ohanaSharedPackage.createAuditEvent).toBeCalledTimes(0);
                    expect(result).toEqual(false);
                });
            });
        });
        describe('when user is not mapped to patient', () => {
            test('then it should return null', async () => {
                ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        patientId: 1
                    },
                    {
                        role: 'ApprovedUser',
                        userId: 1,
                        tenantId: 1,
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe'
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

    describe('when there are no active encounter(s)', () => {
        test('then it should return null', async () => {
            ohanaSharedPackage.getPatientActiveEncountersById.mockImplementationOnce(() => false);

            resolver(
                null,
                {
                    patientId: 1
                },
                {
                    role: 'ApprovedUser',
                    userId: 1,
                    tenantId: 1,
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });
});
