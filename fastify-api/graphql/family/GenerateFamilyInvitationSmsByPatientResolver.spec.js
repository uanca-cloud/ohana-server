let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapAzureServiceBusClient: jest.fn(() => {}),
        pushMessageInQueue: jest.fn(() => true),
        hasOpenEncounter: jest.fn(() => true),
        getPatientById: jest.fn(() => {
            return {
                id: 1
            };
        }),
        createAuditEvent: jest.fn(() => true),
        getFamilyInvitationUrl: jest.fn(() => 'https://ohanatest.app.link/IGlIOQS6Zdb'),
        writeLog: jest.fn(() => {}),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        isAllowSecondaryFamilyMemberForPatient: jest.fn(() => Promise.resolve(true)),
        CONSTANTS: {
            OHANA_ROLES: {
                FAMILY_MEMBER: 'FamilyMember'
            }
        }
    }));

    resolver = require('./GenerateFamilyInvitationSmsByPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./GenerateFamilyInvitationSmsByPatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to generate a family invitation', () => {
    describe('when input is provided', () => {
        describe('when encounter was closed', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => false);

                resolver(
                    null,
                    {
                        encounterId: 1,
                        phoneNumber: '+400750000000'
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        sessionId: 1,
                        mappedPatients: [1]
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

        describe('when a patient can be retrieved', () => {
            test('then it should return true', async () => {
                const result = await resolver(
                    null,
                    {
                        encounterId: 1,
                        phoneNumber: '+400750000000'
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        sessionId: 1,
                        mappedPatients: [1]
                    }
                );

                expect(result).toBe(true);
            });

            describe('when allow_secondary is set to false for the patient', () => {
                describe('when the user sending the invite is a caregiver', () => {
                    test('then it should return true', async () => {
                        ohanaSharedPackage.isAllowSecondaryFamilyMemberForPatient.mockImplementationOnce(
                            () => false
                        );

                        const result = await resolver(
                            null,
                            {
                                encounterId: 1,
                                phoneNumber: '+400750000000'
                            },
                            {
                                userId: 1,
                                deviceId: 1,
                                tenantId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                role: 'ApprovedUser',
                                sessionId: 1,
                                mappedPatients: [1]
                            }
                        );

                        expect(result).toBe(true);
                    });
                });

                describe('when the user sending the invite is a primary family member', () => {
                    test('then it should throw', async () => {
                        ohanaSharedPackage.isAllowSecondaryFamilyMemberForPatient.mockImplementationOnce(
                            () => false
                        );

                        await resolver(
                            null,
                            {
                                encounterId: 1,
                                phoneNumber: '+400750000000'
                            },
                            {
                                userId: 1,
                                deviceId: 1,
                                tenantId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                role: 'FamilyMember',
                                sessionId: 1,
                                mappedPatients: [1]
                            }
                        ).catch((e) => {
                            expect(e.extensions.code).toBe('FORBIDDEN');
                            expect(
                                ohanaSharedPackage.getFamilyInvitationUrl
                            ).not.toHaveBeenCalled();
                        });
                    });
                });
            });

            test('then it should fail if the caregiver and patient are not linked', async () => {
                ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() =>
                    Promise.resolve(false)
                );

                await expect(
                    resolver(
                        null,
                        {
                            encounterId: 1,
                            phoneNumber: '+400750000000'
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            sessionId: 1,
                            mappedPatients: []
                        }
                    )
                ).rejects.toThrow();
            });

            test('then it should fail if the family member and patient are not linked', async () => {
                ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() =>
                    Promise.resolve(false)
                );

                await expect(
                    resolver(
                        null,
                        {
                            encounterId: 1,
                            phoneNumber: '+400750000000'
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'FamilyMember',
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            sessionId: 1,
                            mappedPatients: []
                        }
                    )
                ).rejects.toThrow();
            });

            describe('when an invite cannot be created', () => {
                test('then it should return false', async () => {
                    ohanaSharedPackage.getFamilyInvitationUrl.mockImplementationOnce(() => null);

                    const result = await resolver(
                        null,
                        {
                            encounterId: 1,
                            phoneNumber: '+400750000000'
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            sessionId: 1,
                            mappedPatients: [1]
                        }
                    );

                    expect(result).toBe(false);
                });
            });
        });

        describe('when no patient can be retrieved', () => {
            test('then it should return false', async () => {
                ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);

                const result = await resolver(
                    null,
                    {
                        encounterId: 1,
                        phoneNumber: '+400750000000'
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        sessionId: 1,
                        mappedPatients: [1]
                    }
                );

                expect(result).toBe(false);
            });
        });
    });
});
