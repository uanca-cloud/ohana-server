let resolver = null,
    info = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./FamilyPatientResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getPatientsByUser: jest.fn(() => [
            {
                id: '2',
                externalId: '33333',
                externalIdType: 'mrn',
                firstName: 'roxana',
                lastName: 'rox',
                dateOfBirth: '1991-03-15',
                encounterId: '1',
                lastEncounterId: '1',
                location: {
                    id: '1',
                    label: 'ICU'
                },
                allowSecondaryFamilyMembers: true
            }
        ]),
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
                        id: 26,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
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
                        id: 26,
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        firstName: 'Helen',
                        lastName: 'Doe'
                    }
                }
            ];
        }),
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
        writeLog: jest.fn(() => {}),
        getTenantSetting: jest.fn(() => ({key: 'enableFreeTextTranslation', value: 'true'})),
        getLocationSetting: jest.fn(() => ({key: 'allowSecondaryFamilyMembers', value: 'true'}))
    }));

    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation get the family encounter', () => {
    test('then it should return the patient', async () => {
        const result = await resolver(
            null,
            {
                patientId: 1
            },
            {tenantId: 1},
            info
        );

        expect(result).toEqual(
            expect.objectContaining({
                allowSecondaryFamilyMembers: true,
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
                            id: 26,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Helen',
                            lastName: 'Doe'
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
                            id: 26,
                            tenant: {
                                id: 1
                            },
                            role: 'FamilyMember',
                            firstName: 'Helen',
                            lastName: 'Doe'
                        },
                        createdAt: null
                    }
                ],
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
                dateOfBirth: '1991-03-15',
                encounterId: '1',
                lastEncounterId: '1',
                lastUpdatedAt: null,
                externalId: '33333',
                externalIdType: 'mrn',
                firstName: 'roxana',
                id: '2',
                lastName: 'rox',
                location: {id: '1', label: 'ICU'}
            })
        );
    });

    describe('and the patient does not exist', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientsByUser.mockImplementationOnce(() => []);

            await resolver(
                null,
                {
                    externalId: 33333
                },
                {tenantId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });

    describe('when allowSecondaryFamilyMember option is disabled on location settings', () => {
        test('then it should return the patient and null for allowSecondaryFamilyMember', async () => {
            ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => ({
                key: 'allowSecondaryFamilyMembers',
                value: 'false'
            }));

            const result = await resolver(
                null,
                {
                    patientId: 1
                },
                {tenantId: 1},
                info
            );

            expect(result).toEqual(
                expect.objectContaining({
                    allowSecondaryFamilyMembers: null,
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
                                id: 26,
                                tenant: {
                                    id: 1
                                },
                                role: 'FamilyMember',
                                firstName: 'Helen',
                                lastName: 'Doe'
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
                                id: 26,
                                tenant: {
                                    id: 1
                                },
                                role: 'FamilyMember',
                                firstName: 'Helen',
                                lastName: 'Doe'
                            },
                            createdAt: null
                        }
                    ],
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
                    dateOfBirth: '1991-03-15',
                    encounterId: '1',
                    lastEncounterId: '1',
                    lastUpdatedAt: null,
                    externalId: '33333',
                    externalIdType: 'mrn',
                    firstName: 'roxana',
                    id: '2',
                    lastName: 'rox',
                    location: {id: '1', label: 'ICU'}
                })
            );
        });
    });

    describe('when allowSecondaryFamilyMember option does not exist on location settings', () => {
        test('then it should return the patient and null for allowSecondaryFamilyMember', async () => {
            ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => null);

            const result = await resolver(
                null,
                {
                    patientId: 1
                },
                {tenantId: 1},
                info
            );

            expect(result).toEqual(
                expect.objectContaining({
                    allowSecondaryFamilyMembers: null,
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
                                id: 26,
                                tenant: {
                                    id: 1
                                },
                                role: 'FamilyMember',
                                firstName: 'Helen',
                                lastName: 'Doe'
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
                                id: 26,
                                tenant: {
                                    id: 1
                                },
                                role: 'FamilyMember',
                                firstName: 'Helen',
                                lastName: 'Doe'
                            },
                            createdAt: null
                        }
                    ],
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
                    dateOfBirth: '1991-03-15',
                    encounterId: '1',
                    lastEncounterId: '1',
                    lastUpdatedAt: null,
                    externalId: '33333',
                    externalIdType: 'mrn',
                    firstName: 'roxana',
                    id: '2',
                    lastName: 'rox',
                    location: {id: '1', label: 'ICU'}
                })
            );
        });
    });
});
