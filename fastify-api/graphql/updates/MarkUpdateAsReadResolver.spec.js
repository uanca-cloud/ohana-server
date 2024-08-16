let resolver = null,
    ohanaSharedPackage = null;
beforeEach(() => {
    resolver = require('./MarkUpdateAsReadResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        markUpdatesAsRead: jest.fn(() => {
            return [
                {
                    id: '123'
                },
                {
                    id: '1234'
                }
            ];
        }),
        getUserByUserId: jest.fn(() => {
            return {
                id: 'e671b4a5-8147-423c-b7cf-3fddb508767b',
                tenant: {
                    id: 'e046f32e-f97c-eb11-9889-00155d03ff5d'
                },
                role: 'FamilyMember',
                assignedRoles: ['FamilyMember', 'ApprovedUser'],
                title: 'Contingent Labor',
                firstName: 'John',
                lastName: 'Doe',
                acceptedEula: false,
                renewEula: false,
                email: null
            };
        }),
        getPatientsByUser: jest.fn(() => [
            {
                id: '123',
                location: {
                    id: '123'
                }
            }
        ]),
        getUpdateByUpdateIds: jest.fn(() => [
            {
                id: '123',
                read: true,
                text: 'test 1'
            },
            {
                id: '1234',
                read: true,
                text: 'test 2'
            }
        ]),
        getAttachmentsByUpdateId: jest.fn(() => {
            return [
                {
                    quickMessages: [
                        {
                            text: 'Translated QM 1',
                            locale: 'en_US'
                        }
                    ],
                    type: 'quickMessage'
                },
                {
                    quickMessages: [
                        {
                            text: 'Translated QM 2',
                            locale: 'es_ES'
                        }
                    ],
                    type: 'quickMessage'
                }
            ];
        }),
        getPreferredLanguage: jest.fn(() => 'en_US'),
        createAuditEvent: jest.fn(() => true),
        getTenantSetting: jest.fn(() => ({key: 'enableFreeTextTranslation', value: 'true'})),
        rehydrateUser: jest.fn(() => {})
    }));
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to mark some updates as read', () => {
    describe('when quick message updates are read', () => {
        test('then it should return the read updates and call createAuditEvent with quick message data', async () => {
            const result = await resolver(
                null,
                {updateIds: ['123', '1234']},
                {
                    tenantId: 1,
                    userId: '123',
                    deviceName: 'testdevice',
                    deviceId: '123',
                    role: 'FamilyMember'
                }
            );

            expect(result).toEqual([
                {
                    id: '123',
                    text: 'test 1',
                    read: true
                },
                {
                    id: '1234',
                    text: 'test 2',
                    read: true
                }
            ]);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenLastCalledWith({
                tenantId: 1,
                eventId: 'family_read',
                patientId: '123',
                userType: 'FamilyMember',
                userDisplayName: `Doe, John`,
                deviceId: 'testdevice_123',
                osVersion: undefined,
                deviceModel: undefined,
                version: undefined,
                buildNumber: undefined,
                updateContent: 'test 2',
                familyDisplayName: `Doe, John`,
                familyRelation: undefined,
                familyLanguage: 'en_US',
                familyContactNumber: undefined,
                familyMemberType: 'Secondary',
                externalId: undefined,
                locationId: '123',
                updateId: '1234',
                qmUpdate: 'Translated QM 1,',
                freeTextUpdate: null
            });
        });
    });

    describe('when free text updates are read', () => {
        describe('and free text translation flag is on', () => {
            test('then it should return the read updates and call createAuditEvent with free text translation data', async () => {
                ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementation(() => [
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 1',
                                locale: 'en_US'
                            }
                        ],
                        type: 'text'
                    },
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 2',
                                locale: 'es_ES'
                            }
                        ],
                        type: 'text'
                    }
                ]);
                ohanaSharedPackage.getUserByUserId.mockImplementationOnce(() => {
                    return {
                        id: '123',
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        assignedRoles: ['FamilyMember'],
                        title: 'RN',
                        firstName: 'John',
                        lastName: 'Doe',
                        acceptedEula: true,
                        renewEula: false,
                        email: null
                    };
                });

                const result = await resolver(
                    null,
                    {updateIds: ['123', '1234']},
                    {
                        tenantId: 1,
                        userId: '123',
                        deviceName: 'testdevice',
                        deviceId: '1234',
                        version: '1.6.0',
                        role: 'FamilyMember'
                    }
                );

                expect(result).toEqual([
                    {
                        id: '123',
                        text: 'test 1',
                        read: true
                    },
                    {
                        id: '1234',
                        text: 'test 2',
                        read: true
                    }
                ]);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenLastCalledWith({
                    tenantId: 1,
                    eventId: 'family_read',
                    externalId: undefined,
                    patientId: '123',
                    userType: 'FamilyMember',
                    userDisplayName: `Doe, John`,
                    deviceId: 'testdevice_1234',
                    osVersion: undefined,
                    deviceModel: undefined,
                    version: '1.6.0',
                    buildNumber: undefined,
                    updateContent: 'test 2',
                    familyDisplayName: `Doe, John`,
                    familyRelation: undefined,
                    familyLanguage: 'en_US',
                    familyContactNumber: undefined,
                    familyMemberType: 'Secondary',
                    locationId: '123',
                    updateId: '1234',
                    freeTextUpdate: 'Translated Free Text 1,',
                    qmUpdate: null
                });
            });
        });

        describe('and free text translation flag is off', () => {
            test('then it should return the read updates and call createAuditEvent without free text translation data', async () => {
                ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementation(() => [
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 1',
                                locale: 'en_US'
                            }
                        ],
                        type: 'text'
                    },
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 2',
                                locale: 'es_ES'
                            }
                        ],
                        type: 'text'
                    }
                ]);
                ohanaSharedPackage.getUserByUserId.mockImplementationOnce(() => {
                    return {
                        id: '123',
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        assignedRoles: ['FamilyMember'],
                        title: 'RN',
                        firstName: 'John',
                        lastName: 'Doe',
                        acceptedEula: true,
                        renewEula: false,
                        email: null
                    };
                });
                ohanaSharedPackage.getTenantSetting.mockImplementation(() => {
                    return {key: 'enableFreeTextTranslation', value: 'false'};
                });

                const result = await resolver(
                    null,
                    {updateIds: ['123', '1234']},
                    {
                        tenantId: 1,
                        userId: '123',
                        deviceName: 'testdevice',
                        deviceId: '1234',
                        version: '1.6.0',
                        role: 'FamilyMember'
                    }
                );

                expect(result).toEqual([
                    {
                        id: '123',
                        text: 'test 1',
                        read: true
                    },
                    {
                        id: '1234',
                        text: 'test 2',
                        read: true
                    }
                ]);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenLastCalledWith({
                    tenantId: 1,
                    eventId: 'family_read',
                    externalId: undefined,
                    patientId: '123',
                    userType: 'FamilyMember',
                    userDisplayName: `Doe, John`,
                    deviceId: 'testdevice_1234',
                    osVersion: undefined,
                    deviceModel: undefined,
                    version: '1.6.0',
                    buildNumber: undefined,
                    updateContent: 'test 2',
                    familyDisplayName: `Doe, John`,
                    familyRelation: undefined,
                    familyLanguage: 'en_US',
                    familyContactNumber: undefined,
                    familyMemberType: 'Secondary',
                    locationId: '123',
                    updateId: '1234',
                    freeTextUpdate: null,
                    qmUpdate: null
                });
            });
        });

        describe('and free text translation flag does not exist', () => {
            test('then it should return the read updates and call createAuditEvent without free text translation data', async () => {
                ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementation(() => [
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 1',
                                locale: 'en_US'
                            }
                        ],
                        type: 'text'
                    },
                    {
                        translations: [
                            {
                                text: 'Translated Free Text 2',
                                locale: 'es_ES'
                            }
                        ],
                        type: 'text'
                    }
                ]);
                ohanaSharedPackage.getUserByUserId.mockImplementationOnce(() => {
                    return {
                        id: '123',
                        tenant: {
                            id: 1
                        },
                        role: 'FamilyMember',
                        assignedRoles: ['FamilyMember'],
                        title: 'RN',
                        firstName: 'John',
                        lastName: 'Doe',
                        acceptedEula: true,
                        renewEula: false,
                        email: null
                    };
                });
                ohanaSharedPackage.getTenantSetting.mockImplementation(() => null);

                const result = await resolver(
                    null,
                    {updateIds: ['123', '1234']},
                    {
                        tenantId: 1,
                        userId: '123',
                        deviceName: 'testdevice',
                        deviceId: '1234',
                        version: '1.6.0',
                        role: 'FamilyMember'
                    }
                );

                expect(result).toEqual([
                    {
                        id: '123',
                        text: 'test 1',
                        read: true
                    },
                    {
                        id: '1234',
                        text: 'test 2',
                        read: true
                    }
                ]);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
                expect(ohanaSharedPackage.createAuditEvent).toHaveBeenLastCalledWith({
                    tenantId: 1,
                    eventId: 'family_read',
                    externalId: undefined,
                    patientId: '123',
                    userType: 'FamilyMember',
                    userDisplayName: `Doe, John`,
                    deviceId: 'testdevice_1234',
                    osVersion: undefined,
                    deviceModel: undefined,
                    version: '1.6.0',
                    buildNumber: undefined,
                    updateContent: 'test 2',
                    familyDisplayName: `Doe, John`,
                    familyRelation: undefined,
                    familyLanguage: 'en_US',
                    familyContactNumber: undefined,
                    familyMemberType: 'Secondary',
                    locationId: '123',
                    updateId: '1234',
                    freeTextUpdate: null,
                    qmUpdate: null
                });
            });
        });
    });

    describe('when a family join update is found', () => {
        test(`then no 'family_read' audit event should be created for it`, async () => {
            ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementation(() => [
                {
                    type: 'userJoin'
                }
            ]);
            await resolver(null, {updateIds: ['123', '1234']}, {tenantId: 1, userId: '123'});
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(0);
        });
    });

    describe('when no updates are found', () => {
        test('then it should throw an updates not found error', async () => {
            ohanaSharedPackage.getUpdateByUpdateIds.mockImplementationOnce(() => []);
            try {
                await resolver(null, {updateIds: ['123', '1234']}, {tenantId: 1, userId: '123'});
            } catch (e) {
                expect(e.extensions.description).toBe('Update not found');
            }
        });
    });

    describe('when no updates are found or the update has already been marked as read by the same user', () => {
        test('then it should throw an updates not found error', async () => {
            ohanaSharedPackage.markUpdatesAsRead.mockImplementationOnce(() => []);
            try {
                await resolver(null, {updateIds: ['123', '1234']}, {tenantId: 1, userId: '123'});
            } catch (e) {
                expect(e.extensions.description).toBe(
                    'Update not found or it has already been marked as read'
                );
            }
        });
    });

    describe('when no user is found', () => {
        test('then a user not found error should be thrown', async () => {
            ohanaSharedPackage.getUserByUserId.mockImplementationOnce(() => {});
            try {
                await resolver(null, {updateIds: ['123', '1234']}, {tenantId: 1, userId: '123'});
            } catch (e) {
                expect(e.extensions.description).toBe('User not found');
            }
        });
    });

    describe('when no patients are found', () => {
        test('then a patient not found error should be thrown', async () => {
            ohanaSharedPackage.getPatientsByUser.mockImplementationOnce(() => []);
            try {
                await resolver(null, {updateIds: ['123', '1234']}, {tenantId: 1, userId: '123'});
            } catch (e) {
                expect(e.extensions.description).toBe('Patient not found');
            }
        });
    });
});
