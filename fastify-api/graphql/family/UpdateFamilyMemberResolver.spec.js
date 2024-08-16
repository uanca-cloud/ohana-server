const {
    CONSTANTS: {
        AUDIT_EVENTS: {FAMILY_INFO_EDITED},
        OHANA_ROLES: {FAMILY_MEMBER, CAREGIVER}
    }
} = require('ohana-shared');
let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateFamilyMember: jest.fn(() => true),
        isPatient: jest.fn((patientRelationship) => patientRelationship === 'Self/Patient'),
        getFamilyMember: jest.fn(() => ({
            patientRelationship: 'Uncle',
            primary: false,
            createdAt: new Date('2022-10-26T00:00:00.000Z'),
            role: 'FamilyMember',
            assignedRoles: ['FamilyMember']
        })),
        getPreferredLanguage: jest.fn(() => 'English'),
        createAuditEvent: jest.fn(() => true),
        getPatientById: jest.fn(() => {
            return {
                id: 1,
                location: {
                    id: 1
                }
            };
        }),
        sharesPatientsMapping: jest.fn(() => Promise.resolve(true)),
        writeLog: jest.fn(() => {}),
        getUserById: jest.fn(() => {
            return {
                id: 1,
                tenant: {
                    id: 1
                },
                role: 'admin',
                assignedRoles: ['admin']
            };
        }),
        setUserData: jest.fn(),
        gte: jest.fn(() => true),
        isPatientAndNotPrimary: jest.fn(() => false),
        isDuplicatePatient: jest.fn(() => false)
    }));

    resolver = require('./UpdateFamilyMemberResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to update a family member', () => {
    describe('when valid input is provided', () => {
        test('then it should return the updated family member', async () => {
            const result = await resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    version: '1.7.0'
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    tenant: {id: 1},
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    firstName: 'Michael',
                    lastName: 'Doe',
                    phoneNumber: '1337',
                    patientRelationship: 'Uncle',
                    preferredLocale: 'US',
                    primary: false
                })
            );
        });

        test('then we update the redis hash', async () => {
            const result = await resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: 'FamilyMember',
                    assignedRoles: ['FamilyMember'],
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    version: '1.7.0'
                }
            );

            expect(ohanaSharedPackage.setUserData).toHaveBeenCalledWith(
                'd365b853-7315-4e74-b733-99c2cadc42a4',
                result
            );
        });
    });

    describe('when a family member cannot be retrieved', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    version: '1.7.0'
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

    describe('when family member registration is not complete', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => {
                return {tenantId: 1};
            });

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 1,
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    version: '1.7.0'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                    expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                });
        });
    });

    describe('when no patient can be retrieved', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
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
                    expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                });
        });
    });

    describe('when a family member cannot be updated', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.updateFamilyMember.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.name).toBe('Error');
                    expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                });
        });
    });

    describe('when a caregiver updates a family member', () => {
        test('then createAuditEvent function should be called with caregiver information', async () => {
            ohanaSharedPackage.updateFamilyMember.mockImplementationOnce(() => true);
            const result = await resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe',
                        assignedRoles: [FAMILY_MEMBER]
                    }
                },
                {
                    tenantId: 1,
                    role: CAREGIVER,
                    assignedRoles: [CAREGIVER],
                    userId: 1,
                    deviceId: 1,
                    deviceModel: 'android',
                    osVersion: 12,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    email: 'test@test.com',
                    title: 'SoftVision',
                    version: '1.4.0',
                    buildNumber: '900'
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                    tenant: {id: 1},
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    firstName: 'Michael',
                    lastName: 'Doe',
                    phoneNumber: '1337',
                    patientRelationship: 'Uncle',
                    preferredLocale: 'US',
                    primary: false,
                    acceptedEula: false,
                    createdAt: '2022-10-26T00:00:00.000Z',
                    invitedBy: undefined,
                    isPatient: false,
                    renewEula: false
                })
            );
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith({
                eventId: FAMILY_INFO_EDITED,
                userType: CAREGIVER,
                deviceId: '1',
                deviceModel: 'android',
                osVersion: 12,
                version: '1.4.0',
                buildNumber: '900',
                locationId: 1,
                performingUserEmail: 'test@test.com',
                performingUserTitle: 'SoftVision',
                familyContactNumber: '1337',
                familyDisplayName: 'Doe Michael',
                familyLanguage: 'English',
                familyRelation: 'Uncle',
                patientId: 1,
                tenantId: 1,
                userDisplayName: 'Doe, Vlad'
            });
        });
    });

    describe("when a FM didn't finish the registration", () => {
        test("then it can't be updated", () => {
            ohanaSharedPackage.getFamilyMember.mockResolvedValue({});

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: CAREGIVER,
                    assignedRoles: [CAREGIVER],
                    userId: 1,
                    deviceId: 1,
                    deviceModel: 'android',
                    osVersion: 12,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    email: 'test@test.com',
                    title: 'SoftVision',
                    version: '1.4.0',
                    buildNumber: '900'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                    expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                });
        });
    });

    describe("when a family member tries to update a different family member's data", () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.updateFamilyMember.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'd365b853-7315-4e74-b733-99c2cadc42a4',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: CAREGIVER,
                    assignedRoles: [CAREGIVER],
                    userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.message).toBe('Update family member failed');
                    expect(ohanaSharedPackage.setUserData).not.toHaveBeenCalled();
                });
        });
    });

    describe("when a caregiver tries to update a family member's data with which it doesn't share a patient", () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.sharesPatientsMapping.mockImplementationOnce(() =>
                Promise.resolve(false)
            );
            resolver(
                null,
                {
                    familyMember: {
                        userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Uncle',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: CAREGIVER,
                    assignedRoles: [CAREGIVER],
                    userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
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
                    primary: true,
                    patientRelationship: 'Uncle',
                    createdAt: new Date('2022-10-26T00:00:00.000Z')
                };
            });

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Self/Patient',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                    deviceId: 1,
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
            ohanaSharedPackage.isPatientAndNotPrimary.mockImplementationOnce(() =>
                Promise.resolve(true)
            );
            ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => {
                return {
                    tenantId: 1,
                    primary: true,
                    patientRelationship: 'Uncle',
                    createdAt: new Date('2022-10-26T00:00:00.000Z')
                };
            });

            resolver(
                null,
                {
                    familyMember: {
                        userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                        phoneNumber: '1337',
                        preferredLocale: 'US',
                        patientRelationship: 'Self/Patient',
                        firstName: 'Michael',
                        lastName: 'Doe'
                    }
                },
                {
                    tenantId: 1,
                    role: FAMILY_MEMBER,
                    assignedRoles: [FAMILY_MEMBER],
                    userId: 'a165b853-7315-4e74-b733-99c2cadc42a3',
                    deviceId: 1,
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
