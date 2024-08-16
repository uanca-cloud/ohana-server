let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateDevicePushNotificationConfig: jest.fn(() => {
            return {
                deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0',
                deviceToken: 'thisisadevicetoken',
                iv: 'hC4rW7e9ISaR8dwtgGjBzQ==',
                notificationPlatform: 'apns',
                userId: 2,
                osVersion: 'Ios-14',
                deviceModel: 'Iphone 12'
            };
        }),
        listRegistrationsByTag: jest.fn(() => {
            return {
                byPage: jest.fn(() => [[{registrationId: '1234'}]])
            };
        }),
        createNotificationHub: jest.fn(() => {}),
        createRegistrationId: jest.fn(() => '82b4a340-7856-4cb4'),
        createOrUpdateNativeRegistration: jest.fn(() => {
            return {
                apns: () => {
                    return {
                        createOrUpdateNativeRegistration: () => true
                    };
                },
                gcm: () => {
                    return {
                        createOrUpdateNativeRegistration: () => true
                    };
                }
            };
        }),
        generateIv: jest.fn(() => 'hC4rW7e9ISaR8dwtgGjBzQ=='),
        getDeviceInfo: jest.fn(() => Promise.resolve({registrationId: '1234'}))
    }));

    resolver = require('./UpdatePushNotificationsConfigResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to update a device push notification config', () => {
    describe('when user role is family member', () => {
        test('then it should return the device info', async () => {
            const result = await resolver(
                null,
                {
                    config: {
                        deviceToken: 'thisisadevicetoken',
                        partialKey: '5otwihfW7IbyQZhHEhdT5w==',
                        notificationPlatform: 'apns',
                        deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0'
                    }
                },
                {userId: 2, role: 'FamilyMember'}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0',
                    deviceToken: 'thisisadevicetoken',
                    iv: 'hC4rW7e9ISaR8dwtgGjBzQ==',
                    notificationPlatform: 'apns',
                    userId: 2,
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone 12'
                })
            );
        });
    });

    describe('when user role is caregiver', () => {
        test('then it should return the device info', async () => {
            const result = await resolver(
                null,
                {
                    config: {
                        deviceToken: 'thisisadevicetoken',
                        partialKey: '5otwihfW7IbyQZhHEhdT5w==',
                        notificationPlatform: 'apns',
                        deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0'
                    }
                },
                {userId: 2, role: 'ApprovedUser'}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0',
                    deviceToken: 'thisisadevicetoken',
                    iv: 'hC4rW7e9ISaR8dwtgGjBzQ==',
                    notificationPlatform: 'apns',
                    userId: 2,
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone 12'
                })
            );
        });
    });

    describe('when input is not provided', () => {
        test('then it should throw NotFoundError', async () => {
            ohanaSharedPackage.updateDevicePushNotificationConfig.mockImplementation(() => null);
            const paramObject = {
                config: {
                    deviceToken: 'thisisadevicetoken',
                    partialKey: '5otwihfW7IbyQZhHEhdT5w==',
                    notificationPlatform: 'apns',
                    deviceId: 'd849588e-1fc6-4370-9b97-7c663cf46ee0'
                }
            };

            await resolver(null, paramObject, {userId: 2})
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });
});
