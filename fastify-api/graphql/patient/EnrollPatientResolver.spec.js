let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        enrollPatient: jest.fn(() => {
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
                }
            };
        }),
        addEncounterToPatient: jest.fn(() => {
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
                }
            };
        }),
        createAuditEvent: jest.fn(() => true),
        getCaregiversByPatientId: jest.fn(() => {
            return [
                {
                    id: 1,
                    tenant: {
                        id: 1
                    },
                    role: 'ApprovedUser'
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
        getTenantSetting: jest.fn(() => {
            return {value: 'MRN'};
        }),
        getLocationSetting: jest.fn(() => ({key: 'allowSecondaryFamilyMembers', value: 'true'})),
        getRedisCollectionData: jest.fn(() => {
            return {cdrId: '123-456-789'};
        }),
        delRedisCollectionData: jest.fn(() => {}),
        getPatientByCdrId: jest.fn(() => null),
        updatePatientAllowSecondary: jest.fn(() => {}),
        isUserMappedToPatient: jest.fn(() => true),
        insertSessionMappedPatientByIds: jest.fn()
    }));

    resolver = require('./EnrollPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./EnrollPatientResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to enroll a new patient', () => {
    describe('when input is provided', () => {
        test('then it should return the enrolled patient', async () => {
            const result = await resolver(
                null,
                {
                    patient: {
                        externalId: '33333',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
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
                            role: 'ApprovedUser'
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

    describe('and optional allowSecondaryFamilyMembers is not sent', () => {
        test('then it return the enrolled patient', async () => {
            ohanaSharedPackage.getLocationSetting.mockImplementationOnce(() => ({
                key: 'allowSecondaryFamilyMembers',
                value: 'false'
            }));

            const result = await resolver(
                null,
                {
                    patient: {
                        externalId: '33333',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        locationId: 1
                    }
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
                    }
                })
            );
        });
    });

    describe('and there is no cdr id in redis hash map', () => {
        test('then it should call enrollPatient and returned the enrolled patient', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => null);

            const result = await resolver(
                null,
                {
                    patient: {
                        externalId: '33333',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
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
                    }
                })
            );
            expect(ohanaSharedPackage.enrollPatient).toHaveBeenCalledTimes(1);
        });
    });

    describe('and the external id type is Visit Number and a patient with an active encounter already exists', () => {
        describe('and a new encounter can be added to the patient', () => {
            test('then it should call addEncounterToPatient and returned the enrolled patient', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() => {
                    return {value: 'VN'};
                });
                ohanaSharedPackage.getPatientByCdrId.mockImplementationOnce(() => {
                    return {
                        id: '123',
                        externalId: 'MRN1',
                        externalIdType: 'MR',
                        tenantId: '1234'
                    };
                });

                const result = await resolver(
                    null,
                    {
                        patient: {
                            externalId: '33333',
                            firstName: 'roxana',
                            lastName: 'rox',
                            dateOfBirth: '1991-03-15',
                            location: 1,
                            allowSecondaryFamilyMembers: true
                        }
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
                        }
                    })
                );
                expect(ohanaSharedPackage.addEncounterToPatient).toHaveBeenCalledTimes(1);
                expect(ohanaSharedPackage.delRedisCollectionData).toHaveBeenCalledTimes(1);
                expect(ohanaSharedPackage.isUserMappedToPatient).toHaveBeenCalledTimes(1);
            });
        });

        describe('and a new encounter cannot be added to the patient', () => {
            test('then it should throw a forbidden error', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() => {
                    return {value: 'VN'};
                });
                ohanaSharedPackage.addEncounterToPatient.mockImplementationOnce(() => null);
                ohanaSharedPackage.getPatientByCdrId.mockImplementationOnce(() => {
                    return {
                        id: '123',
                        externalId: 'MRN1',
                        externalIdType: 'MR',
                        tenantId: '1234'
                    };
                });

                resolver(
                    null,
                    {
                        patient: {
                            externalId: '33333',
                            firstName: 'roxana',
                            lastName: 'rox',
                            dateOfBirth: '1991-03-15',
                            locationId: 1,
                            allowSecondaryFamilyMembers: true
                        }
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

    describe('and the external id type is not Visit Number', () => {
        describe('and a new patient cannot be added', () => {
            test('then it should throw a forbidden error', async () => {
                ohanaSharedPackage.enrollPatient.mockImplementationOnce(() => null);

                resolver(
                    null,
                    {
                        patient: {
                            externalId: '33333',
                            firstName: 'roxana',
                            lastName: 'rox',
                            dateOfBirth: '1991-03-15',
                            locationId: 1,
                            allowSecondaryFamilyMembers: true
                        }
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

    describe('and if no caregivers are returned', () => {
        test('then it should throw a not found error', async () => {
            ohanaSharedPackage.getCaregiversByPatientId.mockImplementationOnce(() => []);

            resolver(
                null,
                {
                    patient: {
                        externalId: '33333',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
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
                    expect(e.extensions.code).toBe('NOT_FOUND');
                    expect(ohanaSharedPackage.createAuditEvent).not.toBeCalled();
                });
        });
    });
});
