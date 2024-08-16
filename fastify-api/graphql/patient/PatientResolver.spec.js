let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./PatientResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        writeLog: jest.fn(() => {}),
        getCaregiversByPatientId: jest.fn(() => {
            return [
                {
                    id: 1,
                    tenant: {
                        id: 1
                    },
                    role: 'admin'
                },
                {
                    id: 2,
                    tenant: {
                        id: 1
                    },
                    role: 'ApprovedUser'
                }
            ];
        }),
        getPatientById: jest.fn(() => {
            return {
                id: '29',
                externalId: '22224444',
                externalIdType: 'mrn',
                firstName: 'roxana',
                lastName: 'rox',
                dateOfBirth: '1991-03-15',
                location: {
                    id: '2',
                    label: 'RMN'
                },
                encounterId: 28,
                lastEncounterId: 28,
                allowSecondaryFamilyMembers: true
            };
        }),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        createAuditEvent: jest.fn(() => Promise.resolve(true)),
        getUpdates: jest.fn(() => {
            return [
                {
                    id: '017ceb1b-eafa-4439-922a-91b3fe885958',
                    text: 'Update 1',
                    createdAt: '1617270241611',
                    caregiver: {
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        tenant: {
                            id: '1'
                        },
                        id: '1'
                    }
                },
                {
                    id: 'c70c176e-e899-4cf3-bee2-bdf97c98c542',
                    text: 'Update 2',
                    createdAt: '1617270297604',
                    caregiver: {
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        tenant: {
                            id: '1'
                        },
                        id: '1'
                    }
                }
            ];
        }),
        getFamilyMembersByPatientId: jest.fn(() => {
            return [
                {
                    id: 24,
                    tenant: {
                        id: 1
                    },
                    role: 'FamilyMember',
                    firstName: 'Helen',
                    lastName: 'Doe',
                    phoneNumber: '1234',
                    patientRelationship: 'Uncle',
                    preferredLocale: 'US',
                    invitedBy: {
                        id: 1,
                        tenant: {
                            id: 1
                        },
                        role: 'admin'
                    }
                },
                {
                    id: 25,
                    tenant: {
                        id: 1
                    },
                    role: 'FamilyMember',
                    firstName: 'Miriam',
                    lastName: 'Doe',
                    phoneNumber: '4321',
                    patientRelationship: 'Child',
                    preferredLocale: 'US',
                    invitedBy: {
                        id: 1,
                        tenant: {
                            id: 1
                        },
                        role: 'admin'
                    }
                }
            ];
        }),
        getLocationSetting: jest.fn(() => ({key: 'allowSecondaryFamilyMembers', value: 'true'})),
        getTenantSetting: jest.fn(() => ({key: 'enableFreeTextTranslation', value: 'true'})),
        isUserMappedToPatient: jest.fn(() => true)
    }));

    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./PatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get a patient', () => {
    describe('when input is provided', () => {
        test('then it should return the patient', async () => {
            const result = await resolver(null, {externalId: 22224444}, {tenantId: 1});

            expect(result).toEqual(
                expect.objectContaining({
                    id: '29',
                    externalId: '22224444',
                    externalIdType: 'mrn',
                    firstName: 'roxana',
                    lastName: 'rox',
                    dateOfBirth: '1991-03-15',
                    location: {
                        id: '2',
                        label: 'RMN'
                    },
                    encounterId: 28,
                    lastEncounterId: 28,
                    lastUpdatedAt: null,
                    allowSecondaryFamilyMembers: true,
                    updates: [
                        {
                            id: '017ceb1b-eafa-4439-922a-91b3fe885958',
                            text: 'Update 1',
                            createdAt: '1617270241611',
                            caregiver: {
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenant: {
                                    id: '1'
                                },
                                id: '1'
                            }
                        },
                        {
                            id: 'c70c176e-e899-4cf3-bee2-bdf97c98c542',
                            text: 'Update 2',
                            createdAt: '1617270297604',
                            caregiver: {
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenant: {
                                    id: '1'
                                },
                                id: '1'
                            }
                        }
                    ],
                    familyMembers: [
                        {
                            id: 24,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Helen',
                            lastName: 'Doe',
                            phoneNumber: '1234',
                            patientRelationship: 'Uncle',
                            preferredLocale: 'US',
                            invitedBy: {
                                id: 1,
                                tenant: {
                                    id: 1
                                },
                                role: 'admin'
                            },
                            createdAt: null
                        },
                        {
                            id: 25,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Miriam',
                            lastName: 'Doe',
                            phoneNumber: '4321',
                            patientRelationship: 'Child',
                            preferredLocale: 'US',
                            invitedBy: {
                                id: 1,
                                tenant: {
                                    id: 1
                                },
                                role: 'admin'
                            },
                            createdAt: null
                        }
                    ],
                    caregivers: [
                        {
                            id: 1,
                            tenant: {
                                id: 1
                            },
                            role: 'admin'
                        },
                        {
                            id: 2,
                            tenant: {
                                id: 1
                            },
                            role: 'ApprovedUser'
                        }
                    ]
                })
            );
        });
    });

    describe('when no open encounter exists for that patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

            resolver(
                null,
                {
                    patientId: 1
                },
                {tenantId: 1, userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });

    describe('when the caregiver and patient are not mapped', () => {
        test('then it should fail if the caregiver and patient are not linked', () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() =>
                Promise.resolve(false)
            );

            resolver(
                null,
                {
                    patientId: 1
                },
                {tenantId: 1, userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('and optional allowSecondaryFamilyMembers is not sent', () => {
        test('then it return the patient information', async () => {
            ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => ({
                key: 'allowSecondaryFamilyMembers',
                value: 'false'
            }));

            const result = await resolver(
                null,
                {
                    patientId: 1
                },
                {tenantId: 1, userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '29',
                    externalId: '22224444',
                    externalIdType: 'mrn',
                    firstName: 'roxana',
                    lastName: 'rox',
                    dateOfBirth: '1991-03-15',
                    location: {
                        id: '2',
                        label: 'RMN'
                    },
                    encounterId: 28,
                    lastEncounterId: 28,
                    lastUpdatedAt: null,
                    allowSecondaryFamilyMembers: null,
                    updates: [
                        {
                            id: '017ceb1b-eafa-4439-922a-91b3fe885958',
                            text: 'Update 1',
                            createdAt: '1617270241611',
                            caregiver: {
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenant: {
                                    id: '1'
                                },
                                id: '1'
                            }
                        },
                        {
                            id: 'c70c176e-e899-4cf3-bee2-bdf97c98c542',
                            text: 'Update 2',
                            createdAt: '1617270297604',
                            caregiver: {
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                tenant: {
                                    id: '1'
                                },
                                id: '1'
                            }
                        }
                    ],
                    familyMembers: [
                        {
                            id: 24,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Helen',
                            lastName: 'Doe',
                            phoneNumber: '1234',
                            patientRelationship: 'Uncle',
                            preferredLocale: 'US',
                            invitedBy: {
                                id: 1,
                                tenant: {
                                    id: 1
                                },
                                role: 'admin'
                            },
                            createdAt: null
                        },
                        {
                            id: 25,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Miriam',
                            lastName: 'Doe',
                            phoneNumber: '4321',
                            patientRelationship: 'Child',
                            preferredLocale: 'US',
                            invitedBy: {
                                id: 1,
                                tenant: {
                                    id: 1
                                },
                                role: 'admin'
                            },
                            createdAt: null
                        }
                    ]
                })
            );
        });
    });
});
