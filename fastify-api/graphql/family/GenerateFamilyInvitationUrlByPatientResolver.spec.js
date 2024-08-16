let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getFamilyInvitationUrl: jest.fn(() => 'https://ohanatest.app.link/IGlIOQS6Zdb'),
        createAuditEvent: jest.fn(() => true),
        hasOpenEncounter: jest.fn(() => true),
        isUserMappedToPatient: jest.fn(() => true),
        getPatientById: jest.fn(() => {
            return {
                id: 1
            };
        }),
        writeLog: jest.fn(() => {}),
        isAllowSecondaryFamilyMemberForPatient: jest.fn(() => Promise.resolve(true)),
        CONSTANTS: {
            OHANA_ROLES: {
                FAMILY_MEMBER: 'FamilyMember'
            }
        }
    }));

    resolver = require('./GenerateFamilyInvitationUrlByPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to generate a branch io url', () => {
    describe('when input is provided', () => {
        describe('when a patient can be retrieved', () => {
            test('then it should return the url', async () => {
                const result = await resolver(
                    null,
                    {
                        encounterId: 1
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        role: 'ApprovedUser',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                );

                expect(result).toBe('https://ohanatest.app.link/IGlIOQS6Zdb');
            });

            describe('when allow_secondary is set to false for the patient', () => {
                describe('when the user sending the invite is a caregiver', () => {
                    test('then it should return the url', async () => {
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
                                role: 'ApprovedUser'
                            }
                        );

                        expect(result).toBe('https://ohanatest.app.link/IGlIOQS6Zdb');
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
                                role: 'FamilyMember'
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
                            encounterId: 1
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe'
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
                            encounterId: 1
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'FamilyMember',
                            firstName: 'Vlad',
                            lastName: 'Doe'
                        }
                    )
                ).rejects.toThrow();
            });

            describe('when an invite cannot be created', () => {
                test('then it should throw', async () => {
                    ohanaSharedPackage.getFamilyInvitationUrl.mockImplementationOnce(() => null);

                    resolver(
                        null,
                        {
                            encounterId: 1
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            tenantId: 1,
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe'
                        }
                    )
                        .then(() => {
                            fail('Error should occur');
                        })
                        .catch((e) => {
                            expect(e.name).toBe('Error');
                        });
                });
            });
        });

        describe('when no patient can be retrieved', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        encounterId: 1
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        role: 'ApprovedUser',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.name).toBe('Error');
                    });
            });
        });

        describe('when encounter was closed', () => {
            test('then it should throw', async () => {
                ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        encounterId: 1
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        tenantId: 1,
                        role: 'ApprovedUser',
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
});
