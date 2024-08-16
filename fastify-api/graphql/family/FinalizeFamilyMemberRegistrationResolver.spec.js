const {
    CONSTANTS: {
        AUDIT_EVENTS: {FAMILY_ENROLLED},
        OHANA_ROLES
    }
} = require('ohana-shared');

let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared/constants'),
            DISABLE_CSA_INTEGRATION: false
        },
        getPatientsByUser: jest.fn(() => {
            return [
                {
                    dateOfBirth: '1991-03-15'
                }
            ];
        }),
        updateFamilyMember: jest.fn(() => true),
        getFamilyMember: jest.fn(() => ({
            primary: true,
            invitedBy: {
                id: 25,
                tenant: {
                    id: 1
                },
                role: 'FamilyMember',
                firstName: 'Helen',
                lastName: 'Doe'
            }
        })),
        getPreferredLanguage: jest.fn(() => 'English'),
        createAuditEvent: jest.fn(() => true),
        writeLog: jest.fn(() => {}),
        getUserById: jest.fn(() => {
            return {
                id: 25,
                tenant: {
                    id: 1
                },
                role: 'FamilyMember',
                firstName: 'Helen',
                lastName: 'Doe'
            };
        }),
        createUpdate: jest.fn(() => ({rows: [{id: '123'}]})),
        createAttachment: jest.fn(() => ({rows: [{id: '1234'}]})),
        setUserData: jest.fn(),
        isPatient: jest.fn((patientRelationship) => patientRelationship === 'Self/Patient'),
        isPatientAndNotPrimary: jest.fn(() => false),
        isDuplicatePatient: jest.fn(() => false),
        addChatMembers: jest.fn()
    }));

    resolver = require('./FinalizeFamilyMemberRegistrationResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to finalize creating a new family member', () => {
    describe('when valid input is provided', () => {
        describe('and family member is primary', () => {
            test('then it should return the family member object and call createAuditEvent with familyMemberType Primary', async () => {
                const result = await resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        buildNumber: '900',
                        version: '1.4.0',
                        deviceId: '123',
                        assignedRoles: [OHANA_ROLES.FAMILY_MEMBER]
                    }
                );

                expect(result).toEqual({
                    id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    tenant: {id: 1},
                    role: 'FamilyMember',
                    firstName: 'Michael',
                    lastName: 'Doe',
                    phoneNumber: '1337',
                    patientRelationship: 'Uncle',
                    preferredLocale: 'US',
                    invitedBy: {
                        id: 25,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
                    },
                    primary: true,
                    createdAt: null,
                    acceptedEula: false,
                    assignedRoles: [OHANA_ROLES.FAMILY_MEMBER],
                    renewEula: false,
                    isPatient: false
                });
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith({
                    eventId: FAMILY_ENROLLED,
                    userType: 'FamilyMember',
                    userDisplayName: 'Doe Michael',
                    familyDisplayName: 'Doe Michael',
                    deviceId: '123',
                    deviceModel: undefined,
                    osVersion: undefined,
                    version: '1.4.0',
                    buildNumber: '900',
                    locationId: undefined,
                    tenantId: 1,
                    patientId: undefined,
                    familyMemberType: 'Primary',
                    familyContactNumber: '1337',
                    familyLanguage: 'English',
                    familyRelation: 'Uncle'
                });
            });
        });

        describe('and family member is not primary', () => {
            test('then it should return the family member object and call createAuditEvent with familyMemberType Secondary', async () => {
                ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => ({
                    primary: false,
                    invitedBy: {
                        id: 25,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
                    },
                    createdAt: new Date('2022-10-26T00:00:00.000Z')
                }));

                const result = await resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        buildNumber: '900',
                        version: '1.4.0',
                        deviceId: '123'
                    }
                );

                expect(result).toEqual({
                    id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    tenant: {id: 1},
                    role: 'FamilyMember',
                    firstName: 'Michael',
                    lastName: 'Doe',
                    phoneNumber: '1337',
                    patientRelationship: 'Uncle',
                    preferredLocale: 'US',
                    invitedBy: {
                        id: 25,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
                    },
                    primary: false,
                    createdAt: '2022-10-26T00:00:00.000Z',
                    acceptedEula: false,
                    renewEula: false,
                    isPatient: false
                });
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith({
                    eventId: FAMILY_ENROLLED,
                    userType: 'FamilyMember',
                    userDisplayName: 'Doe Michael',
                    familyDisplayName: 'Doe Michael',
                    deviceId: '123',
                    deviceModel: undefined,
                    osVersion: undefined,
                    version: '1.4.0',
                    buildNumber: '900',
                    locationId: undefined,
                    tenantId: 1,
                    patientId: undefined,
                    familyMemberType: 'Secondary',
                    familyContactNumber: '1337',
                    familyLanguage: 'English',
                    familyRelation: 'Uncle'
                });
            });
        });

        describe('and family member is relationship to patient is Self/Patient', () => {
            test('then it should return the family member object with isPatient flag set to true', async () => {
                const result = await resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Self/Patient',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        buildNumber: '900',
                        version: '1.4.0',
                        deviceId: '123'
                    }
                );

                expect(result).toEqual({
                    id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    tenant: {id: 1},
                    role: 'FamilyMember',
                    firstName: 'Michael',
                    lastName: 'Doe',
                    phoneNumber: '1337',
                    patientRelationship: 'Self/Patient',
                    preferredLocale: 'US',
                    invitedBy: {
                        id: 25,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
                    },
                    primary: true,
                    createdAt: null,
                    acceptedEula: false,
                    renewEula: false,
                    isPatient: true
                });
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith({
                    eventId: FAMILY_ENROLLED,
                    userType: 'FamilyMember',
                    userDisplayName: 'Doe Michael',
                    familyDisplayName: 'Doe Michael',
                    deviceId: '123',
                    deviceModel: undefined,
                    osVersion: undefined,
                    version: '1.4.0',
                    buildNumber: '900',
                    locationId: undefined,
                    tenantId: 1,
                    patientId: undefined,
                    familyMemberType: 'Primary',
                    familyContactNumber: '1337',
                    familyLanguage: 'English',
                    familyRelation: 'Self/Patient'
                });
            });
        });

        describe('when family member cannot be updated', function () {
            test('then it should throw', async () => {
                ohanaSharedPackage.updateFamilyMember.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
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

        test("then we call setUserData with the user's data", async () => {
            const userData = {
                id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                tenant: {id: 1},
                role: 'FamilyMember',
                firstName: 'Michael',
                lastName: 'Doe',
                phoneNumber: '1337',
                patientRelationship: 'Uncle',
                preferredLocale: 'US',
                invitedBy: {
                    id: 25,
                    tenant: {
                        id: 1
                    },
                    role: 'FamilyMember',
                    firstName: 'Helen',
                    lastName: 'Doe'
                },
                primary: false,
                createdAt: new Date('2022-10-26T00:00:00.000Z'),
                acceptedEula: false
            };
            ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => userData);

            const user = await resolver(
                null,
                {
                    familyMember: {
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientDateOfBirth: '1991-03-15',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: 'FamilyMember',
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    buildNumber: '900',
                    version: '1.4.0',
                    deviceId: '123'
                }
            );

            expect(ohanaSharedPackage.setUserData).toHaveBeenCalledWith(
                'd365b853-7315-4e74-b733-99c2cadc42a4',
                user
            );
        });

        test('then we call the add members to chat function', async () => {
            ohanaSharedPackage.getPatientsByUser.mockResolvedValueOnce([
                {
                    dateOfBirth: '1991-03-15',
                    patientUlid: 'asd'
                }
            ]);

            await resolver(
                null,
                {
                    familyMember: {
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientDateOfBirth: '1991-03-15',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    tenantShortCode: '0000',
                    role: 'FamilyMember',
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    buildNumber: '900',
                    version: '1.4.0',
                    deviceId: '123'
                }
            );

            expect(ohanaSharedPackage.addChatMembers).toHaveBeenCalled();
        });
    });

    describe('when invalid input is provided', () => {
        describe('when family member cannot be retrieved', function () {
            test('then it should throw', async () => {
                ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('NOT_FOUND');
                        expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                    });
            });
        });

        describe('when patient date of birth from database is different from input date of birth', function () {
            test('then it should throw ForbiddenError', async () => {
                resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-05-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('VALIDATION_ERROR');
                        expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                    });
            });
        });

        describe('when no patients are found', function () {
            test('then it should throw NotFoundError', async () => {
                ohanaSharedPackage.getPatientsByUser.mockImplementationOnce(() => []);

                await resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Uncle',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('NOT_FOUND');
                        expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                    });
            });
        });

        describe('when patient relationship is duplicated', () => {
            test('then it should throw a DuplicatePatientUserError', async () => {
                ohanaSharedPackage.isDuplicatePatient.mockImplementationOnce(() =>
                    Promise.resolve(true)
                );
                ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => {
                    return {
                        tenantId: 1,
                        primary: true
                    };
                });

                resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-05-15',
                            patientRelationship: 'Self/Patient',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('DUPLICATE_PATIENT_USER');
                        expect(ohanaSharedPackage.updateFamilyMember).not.toHaveBeenCalled();
                    });
            });
        });

        describe('when family member is not primary but relationship to patient is Self/pPatient', () => {
            test('then it should throw a InvalidFamilyTypeError', async () => {
                ohanaSharedPackage.isPatientAndNotPrimary.mockImplementationOnce(() => true);
                ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => {
                    return {
                        tenantId: 1,
                        primary: false
                    };
                });

                resolver(
                    null,
                    {
                        familyMember: {
                            phoneNumber: '1337',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-05-15',
                            patientRelationship: 'Self/Patient',
                            firstName: 'Michael',
                            lastName: 'Doe'
                        }
                    },
                    {
                        tenantId: 1,
                        role: 'FamilyMember',
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        firstName: 'Vlad',
                        lastName: 'Doe'
                    }
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('INVALID_FAMILY_TYPE');
                        expect(ohanaSharedPackage.updateFamilyMember).not.toHaveBeenCalled();
                    });
            });
        });
    });
});
