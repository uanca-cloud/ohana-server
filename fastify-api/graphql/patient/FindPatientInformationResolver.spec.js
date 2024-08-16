let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        convertExternalIdTypeNameToId: jest.fn(() => 'MR'),
        fetchPatientInformationFromZenithAPI: jest.fn(() => {
            return {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1991-03-15'
            };
        }),
        getPatientById: jest.fn(() => {
            return {
                id: '2',
                externalId: '33333',
                externalIdType: 'MRN',
                firstName: 'roxana',
                lastName: 'rox',
                dateOfBirth: '1991-03-15',
                location: {
                    id: '1',
                    label: 'ICU'
                },
                allowSecondaryFamilyMembers: true,
                encounterId: 1,
                lastEncounterId: 1
            };
        }),
        getLocationSetting: jest.fn(() => ({key: 'allowSecondaryFamilyMembers', value: 'true'})),
        getTenantSetting: jest.fn(() => ({key: 'enableFreeTextTranslation', value: 'true'})),
        getFamilyMembersByPatientId: jest.fn(() => {
            return [];
        }),
        getUpdates: jest.fn(() => {
            return [];
        }),
        setRedisCollectionData: jest.fn(() => {}),
        checkExternalIdTypeOnTenant: jest.fn(() => Promise.resolve(true)),
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
        })
    }));

    resolver = require('./FindPatientInformationResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./FindPatientInformationResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to find the patient information for an external id', () => {
    describe('when an active encounter exists', () => {
        describe('when allowSecondaryFamilyMemberFromAdmin exists and is true', () => {
            test('then it should return the patient information', async () => {
                const result = await resolver(
                    null,
                    {
                        externalId: '33333',
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                    },
                    {tenantId: 1}
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        id: '2',
                        externalId: '33333',
                        externalIdType: 'MRN',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        location: {
                            id: '1',
                            label: 'ICU'
                        },
                        encounterId: 1,
                        lastEncounterId: 1,
                        lastUpdatedAt: null,
                        familyMembers: [],
                        updates: [],
                        allowSecondaryFamilyMembers: true,
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

        describe('when allowSecondaryFamilyMemberFromAdmin exists and is false', () => {
            test('then it should return the patient information with allowSecondaryFamilyMemberFromAdmin null', async () => {
                ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => ({
                    key: 'allowSecondaryFamilyMembers',
                    value: 'false'
                }));

                const result = await resolver(
                    null,
                    {
                        externalId: '33333',
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                    },
                    {tenantId: 1}
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        id: '2',
                        externalId: '33333',
                        externalIdType: 'MRN',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        location: {
                            id: '1',
                            label: 'ICU'
                        },
                        encounterId: 1,
                        lastEncounterId: 1,
                        lastUpdatedAt: null,
                        familyMembers: [],
                        updates: [],
                        allowSecondaryFamilyMembers: null,
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

        describe('when allowSecondaryFamilyMemberFromAdmin is null', () => {
            test('then it should return the patient information with allowSecondaryFamilyMemberFromAdmin null', async () => {
                ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => null);

                const result = await resolver(
                    null,
                    {
                        externalId: '33333',
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                    },
                    {tenantId: 1}
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        id: '2',
                        externalId: '33333',
                        externalIdType: 'MRN',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        location: {
                            id: '1',
                            label: 'ICU'
                        },
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
                        ],
                        encounterId: 1,
                        lastEncounterId: 1,
                        lastUpdatedAt: null,
                        familyMembers: [],
                        updates: [],
                        allowSecondaryFamilyMembers: null
                    })
                );
            });
        });
    });

    describe('when a patient or an active encounter does not exist but patient information exists on zenith', () => {
        test('then it should return the patient information', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);

            const result = await resolver(
                null,
                {
                    externalId: '33333',
                    bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                },
                {tenantId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1991-03-15'
                })
            );
        });
    });

    describe('when a patient or an active encounter does not exist and patient information does not exist on zenith', () => {
        describe('and the external id code is valid', () => {
            test('then it should return null', async () => {
                ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);
                ohanaSharedPackage.fetchPatientInformationFromZenithAPI.mockImplementationOnce(
                    () => null
                );

                const result = await resolver(
                    null,
                    {
                        externalId: '33333',
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                    },
                    {tenantId: 1}
                );

                expect(result).toEqual(null);
            });
        });

        describe('and the external id code is not valid', () => {
            test('then it should return null', async () => {
                ohanaSharedPackage.getPatientById.mockImplementationOnce(() => null);
                ohanaSharedPackage.convertExternalIdTypeNameToId.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        externalId: '33333',
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                    },
                    {tenantId: 1}
                )
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.extensions.code).toBe('VALIDATION_ERROR');
                    });
            });
        });
    });

    describe('when the external id type sent does not match the external id type on tenant', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.checkExternalIdTypeOnTenant.mockImplementationOnce(() =>
                Promise.resolve(false)
            );

            await resolver(
                null,
                {
                    externalId: '33333',
                    bearerToken: 'eyJhbGciOiJIUzI1NiIs'
                },
                {tenantId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('VALIDATION_ERROR');
                });
        });
    });
});
