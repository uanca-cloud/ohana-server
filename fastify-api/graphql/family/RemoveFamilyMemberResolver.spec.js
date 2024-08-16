const {
    CONSTANTS: {
        AUDIT_EVENTS: {FAMILY_UNENROLLED}
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
        deleteSessionByUserId: jest.fn(() => null),
        deleteUserData: jest.fn(),
        removeFamilyMember: jest.fn(() => true),
        getFamilyMember: jest.fn(() => {
            return {
                firstName: 'Vlad',
                lastName: 'Doe',
                patientRelationship: 'Uncle',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                id: 10,
                tenantId: 1,
                encounterId: 1,
                role: 'FamilyMember',
                patientId: 1
            };
        }),
        getPreferredLanguage: jest.fn(() => 'English'),
        getPatientById: jest.fn(() => {
            return {
                id: 1,
                location: {id: 1, label: 'Surgery'}
            };
        }),
        getDeviceInfoByUserId: jest.fn(() => ({
            deviceId: 'dadsfffere-232ds-2323232',
            deviceToken: 'fsfds-dfdfd-fdfd',
            iv: 'hsssssssssR8dwtgGjBzQ==',
            notificationPlatform: 'apns'
        })),
        hasOpenEncounter: jest.fn(() => true),
        createAuditEvent: jest.fn(() => true),
        listRegistrationsByTag: jest.fn(() => []),
        createNotificationHub: jest.fn(() => {}),
        sendPushNotification: jest.fn(() => true),
        generatePushNotificationPayload: jest.fn(() => {
            return {aps: {'content-available': '1'}, type: 'apns', message: '', sender: ''};
        }),
        getFamilyMemberDevices: jest.fn(() => [
            {
                firstName: 'Vlad',
                lastName: 'Doe',
                patientRelationship: 'Uncle',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                id: 10,
                tenantId: 1,
                entityId: 1,
                role: 'FamilyMember',
                deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0',
                deviceToken: 'thisisadevicetoken',
                iv: 'hC4rW7e9ISaR8dwtgGjBzQ==',
                notificationPlatform: 'apns'
            },
            {
                firstName: 'John',
                lastName: 'Doe',
                patientRelationship: 'Brother',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                id: 11,
                tenantId: 1,
                encounterId: 1,
                primary: false,
                role: 'FamilyMember',
                deviceId: 'd8495ddd88e-1fc6-4370-9b97-7c663cf46ee0',
                deviceToken: 'thisistheseconddevicetoken',
                iv: 'hC4rW7e9ISaR8dwtgGjBzQ==',
                notificationPlatform: 'gcm'
            }
        ]),
        getFamilyMembersByPatientId: jest.fn(() => [
            {
                firstName: 'Vlad',
                lastName: 'Doe',
                patientRelationship: 'Uncle',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                id: 10,
                tenantId: 1,
                encounterId: 1,
                primary: true,
                role: 'FamilyMember'
            },
            {
                firstName: 'John',
                lastName: 'Doe',
                patientRelationship: 'Brother',
                phoneNumber: '+511551',
                preferredLocale: 'en_US',
                id: 11,
                tenantId: 1,
                encounterId: 1,
                primary: false,
                role: 'FamilyMember'
            }
        ]),
        sharesPatientsMapping: jest.fn(() => Promise.resolve(true)),
        writeLog: jest.fn(() => {}),
        delRedisCollectionData: jest.fn(() => true),
        getRedisHashMap: jest.fn(() => {
            return {
                sessionIds: ['1234']
            };
        }),
        deleteRedisHashMap: jest.fn(() => true),
        getRedisCollectionData: jest.fn(() => {}),
        removeUserAsChatMember: jest.fn(() => Promise.resolve()),
        removeUsersAsChatMembers: jest.fn(() => Promise.resolve())
    }));

    resolver = require('./RemoveFamilyMemberResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./RemoveFamilyMemberResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to remove a family member', () => {
    describe('when last primary family member is removed', () => {
        test('then two audit events should be inserted', async () => {
            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            );

            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });

        test('then all remaining family members should be removed', async () => {
            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            );

            expect(ohanaSharedPackage.removeFamilyMember).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });

        test('then the FM data should be removed from redis', async () => {
            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            );

            expect(ohanaSharedPackage.deleteSessionByUserId).toHaveBeenCalledTimes(2);
            expect(ohanaSharedPackage.deleteUserData).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });

        test('then it should remove and send PN to all remaining family members', async () => {
            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1, firstName: 'Vlad', lastName: 'Doe'}
            );

            expect(ohanaSharedPackage.sendPushNotification).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });
    });

    describe('when working with the CSA', () => {
        describe('when CSA integration is disabled and a ulid does not exists on the patient', () => {
            test('then the multiple family members should not be removed from chat group', async () => {
                ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = true;
                const result = await resolver(
                    null,
                    {
                        userId: 10
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        tenantShortCode: '1234'
                    }
                );

                expect(ohanaSharedPackage.removeUserAsChatMember).toHaveBeenCalledTimes(0);
                expect(ohanaSharedPackage.removeUsersAsChatMembers).toHaveBeenCalledTimes(0);
                expect(result).toBe(true);
            });
        });

        describe('when CSA integration is not disabled but a ulid does not exists on the patient', () => {
            test('then the multiple family members should not be removed from chat group', async () => {
                ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = false;
                const result = await resolver(
                    null,
                    {
                        userId: 10
                    },
                    {
                        userId: 1,
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        tenantShortCode: '1234'
                    }
                );

                expect(ohanaSharedPackage.removeUserAsChatMember).toHaveBeenCalledTimes(0);
                expect(ohanaSharedPackage.removeUsersAsChatMembers).toHaveBeenCalledTimes(0);
                expect(result).toBe(true);
            });
        });

        describe('when CSA integration is not disabled and a ulid exists on the patient', () => {
            describe('when there are multiple family members on a patient and the last primary has been removed', () => {
                test('then the multiple family members should be removed from chat group', async () => {
                    ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = false;
                    ohanaSharedPackage.getPatientById.mockImplementation(() => ({
                        id: 1,
                        location: {id: 1, label: 'Surgery'},
                        patientUlid: 'testUlid1'
                    }));
                    const result = await resolver(
                        null,
                        {
                            userId: 10
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            tenantShortCode: '1234'
                        }
                    );

                    expect(ohanaSharedPackage.removeUsersAsChatMembers).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.removeUserAsChatMember).toHaveBeenCalledTimes(0);
                    expect(result).toBe(true);
                });
            });

            describe('when only one family member will be removed', () => {
                test('then the single family member should be removed from chat group', async () => {
                    ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = false;
                    ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementationOnce(() => [
                        {
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            patientRelationship: 'Uncle',
                            phoneNumber: '+511551',
                            preferredLocale: 'en_US',
                            id: 10,
                            tenantId: 1,
                            encounterId: 1,
                            primary: true,
                            role: 'FamilyMember'
                        }
                    ]);
                    ohanaSharedPackage.getPatientById.mockImplementationOnce(() => ({
                        id: 1,
                        location: {id: 1, label: 'Surgery'},
                        patientUlid: 'testUlid1'
                    }));

                    const result = await resolver(
                        null,
                        {
                            userId: 10
                        },
                        {
                            userId: 1,
                            deviceId: 1,
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            tenantShortCode: '1234'
                        }
                    );

                    expect(ohanaSharedPackage.removeUserAsChatMember).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.removeUsersAsChatMembers).toHaveBeenCalledTimes(0);
                    expect(result).toBe(true);
                });
            });
        });
    });

    describe('when encounter is closed', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => false);

            resolver(
                null,
                {
                    userId: 1
                },
                {userId: 1, deviceId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('UNAUTHORIZED');
                });
        });
    });

    describe('when no family member device exists', () => {
        test('then it should not send any notifications', async () => {
            ohanaSharedPackage.getFamilyMemberDevices.mockImplementationOnce(() => []);

            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1}
            );

            expect(ohanaSharedPackage.sendPushNotification).toHaveBeenCalledTimes(0);
            expect(result).toBe(true);
        });
    });

    describe('when push notifications cannot be sent', () => {
        test('then it should return true', async () => {
            ohanaSharedPackage.sendPushNotification.mockImplementationOnce(
                () => new Promise((_resolve, reject) => reject('Error'))
            );

            const result = await resolver(
                null,
                {
                    userId: 10
                },
                {userId: 1, deviceId: 1}
            );

            expect(ohanaSharedPackage.sendPushNotification).toHaveBeenCalledTimes(2);
            await expect(ohanaSharedPackage.sendPushNotification).rejects;
            expect(result).toBe(false);
        });
    });

    describe('when a secondary family member is removed', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    userId: 11
                },
                {userId: 1, deviceId: 1}
            );

            expect(ohanaSharedPackage.sendPushNotification).toHaveBeenCalledTimes(1);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(1);
            expect(ohanaSharedPackage.removeFamilyMember).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });
    });

    describe('when family member is in pending state', () => {
        test('then it should return true', async () => {
            ohanaSharedPackage.getFamilyMember.mockImplementationOnce(() => [
                {
                    firstName: null,
                    lastName: null,
                    patientRelationship: null,
                    phoneNumber: null,
                    preferredLocale: null,
                    id: 12,
                    tenantId: 1,
                    entityId: 1,
                    role: 'FamilyMember'
                }
            ]);

            const result = await resolver(
                null,
                {
                    userId: 12
                },
                {
                    userId: 1,
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    tenantId: 1,
                    performingUserFirstName: 'Jane',
                    performingUserLastName: 'Doe',
                    deviceModel: 'iOS',
                    osVersion: '1.0',
                    version: '1.4.0',
                    buildNumber: '900',
                    role: 'FamilyMember',
                    email: 'doe.vlad@email.com',
                    title: 'Caregiver'
                }
            );

            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledWith({
                eventId: FAMILY_UNENROLLED,
                tenantId: 1,
                patientId: 1,
                performingUserEmail: 'doe.vlad@email.com',
                performingUserTitle: 'Caregiver',
                userType: 'FamilyMember',
                userDisplayName: 'Doe, Vlad',
                deviceId: '1',
                deviceModel: 'iOS',
                osVersion: '1.0',
                version: '1.4.0',
                buildNumber: '900',
                familyDisplayName: null,
                familyRelation: undefined,
                familyLanguage: 'English',
                familyContactNumber: undefined,
                locationId: 1
            });
            expect(result).toBe(true);
        });
    });

    describe('when the caregiver does not share a patient with the family member', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.sharesPatientsMapping.mockImplementationOnce(() =>
                Promise.resolve(false)
            );
            resolver(
                null,
                {
                    userId: 12
                },
                {
                    userId: 1,
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    tenantId: 1,
                    performingUserFirstName: 'Jane',
                    performingUserLastName: 'Doe',
                    deviceModel: 'iOS',
                    osVersion: '1.0',
                    version: '1.4.0',
                    buildNumber: '900',
                    role: 'FamilyMember',
                    email: 'doe.vlad@email.com',
                    title: 'Caregiver'
                }
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                    expect(ohanaSharedPackage.removeFamilyMember).not.toHaveBeenCalled();
                    expect(ohanaSharedPackage.createAuditEvent).not.toHaveBeenCalled();
                });
        });
    });
});
