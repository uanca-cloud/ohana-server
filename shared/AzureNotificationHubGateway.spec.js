let pushNotificationStub = null;

beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01').getTime());

    jest.mock('uuid', () => ({
        v4: jest.fn(() => '123-456-789')
    }));

    jest.mock('@azure/notification-hubs', () => ({
        NotificationHubsClient: jest.fn(() => {
            return {
                notificationHubId: '123',
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [])
                    };
                }),
                listRegistrations: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [])
                    };
                }),
                createOrUpdateRegistration: jest.fn(() => {})
            };
        }),
        createFcmLegacyNotification: jest.fn((payload) => payload),
        createAppleNotification: jest.fn((payload) => payload),
        createFcmV1Notification: jest.fn((payload) => payload),
        createFcmV1RegistrationDescription: jest.fn((payload) => payload)
    }));
    pushNotificationStub = require('./AzureNotificationHubGateway');
});

afterEach(() => {
    jest.unmock('path');
    jest.unmock('./AzureNotificationHubGateway');
    jest.unmock('@azure/notification-hubs');
});

describe('Given we want to call push notification methods on local env', () => {
    beforeEach(() => {
        process.env.BAXTER_ENV = 'local';
    });
    describe('when we want to create a notification hub service', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const result = await pushNotificationStub.createNotificationHub();
            expect(result && typeof result === 'object').toBe(true);
        });
    });
    describe('when we want to create a registration id', () => {
        test('then it should return an object returned from the logger info function', async () => {
            expect(await pushNotificationStub.createRegistrationId(null)).toBe('123-456-789');
        });
    });
    describe('when we want to update or create a native registration', () => {
        describe('and the device type is apple', () => {
            test('then it should return an object returned from the logger info function', async () => {
                const result = await pushNotificationStub.createOrUpdateNativeRegistration(
                    null,
                    'apns',
                    null
                );
                expect(result && typeof result === 'object').toBe(true);
            });
        });

        describe('and the device type is android', () => {
            test('then it should return an object returned from the logger info function', async () => {
                const result = await pushNotificationStub.createOrUpdateNativeRegistration(
                    null,
                    'gcm',
                    null
                );
                expect(result && typeof result === 'object').toBe(true);
            });
        });
    });
    describe('when we want to send a push notification', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const result = await pushNotificationStub.sendPushNotification(null, '1234', {});
            expect(result && typeof result === 'object').toBe(true);
        });
    });
    describe('when we want to generate push notification payload', () => {
        test('then it should return an empty object', async () => {
            const result = await pushNotificationStub.generatePushNotificationPayload(null, {});
            expect(result && typeof result === 'object').toBe(true);
        });
    });
    describe('when we want to list registrations by tag', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const result = await pushNotificationStub.listRegistrationsByTag(null, null);
            expect(result && typeof result === 'object').toBe(true);
        });
    });
    describe('when we want to delete registration', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const result = await pushNotificationStub.deleteRegistration(null, null);
            expect(result && typeof result === 'object').toBe(true);
        });
    });
});

describe('Given we want to call push notification methods on development env', () => {
    beforeEach(() => {
        process.env.BAXTER_ENV = 'development';
    });
    describe('when we want to create a notification hub service', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const result = await pushNotificationStub.createNotificationHub();
            expect(result && typeof result === 'object').toBe(true);
        });
    });

    describe('when we want to create a registration id', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const notificationHubClient = {
                createRegistrationId: jest.fn(() => '123-456-789')
            };

            expect(await pushNotificationStub.createRegistrationId(notificationHubClient)).toBe(
                '123-456-789'
            );
        });
    });

    describe('when we want to update or create a native registration', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const notificationHubClient = {
                createOrUpdateRegistration: jest.fn(() => Promise.resolve({}))
            };

            const result = await pushNotificationStub.createOrUpdateNativeRegistration(
                notificationHubClient,
                'apple',
                {deviceToken: '123456789', userId: '123', registrationId: '123-456-789'}
            );
            expect(result && typeof result === 'object').toBe(true);
        });
    });

    describe('when we want to send a push notification', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const notificationHubClient = {
                sendNotification: jest.fn(() => Promise.resolve({}))
            };

            const result = await pushNotificationStub.sendPushNotification(
                notificationHubClient,
                '1234',
                {}
            );
            expect(result && typeof result === 'object').toBe(true);
        });
    });

    describe('when we want to generate push notification payload', () => {
        describe('and notification platform is fcm', () => {
            test('then it should return the correct payload', async () => {
                const result = await pushNotificationStub.generatePushNotificationPayload('gcm', {
                    title: 'test',
                    body: 'test',
                    message: 'testMessage',
                    type: 'notif',
                    sender: {},
                    appVersion: '1.9.1 (1)',
                    patientId: 1
                });
                expect(result).toStrictEqual({
                    body: JSON.stringify({
                        message: {
                            notification: {
                                title: 'test',
                                body: 'test'
                            },
                            data: {
                                title: 'test',
                                body: 'test',
                                message: 'test',
                                type: 'notif',
                                patientId: '1'
                            },
                            android: {
                                priority: 'high'
                            }
                        }
                    })
                });
            });
        });

        describe('and notification platform is apple', () => {
            test('then it should return the correct payload', async () => {
                const result = await pushNotificationStub.generatePushNotificationPayload('apple', {
                    title: 'test',
                    body: 'test',
                    message: 'testMessage',
                    sender: '1234',
                    type: 'notif'
                });
                expect(result).toStrictEqual({
                    body: JSON.stringify({
                        aps: {
                            sound: 'default',
                            alert: {
                                title: 'test',
                                body: 'test'
                            }
                        },
                        expiry: '2023-01-01T06:00:00.000Z',
                        message: 'testMessage',
                        sender: '1234',
                        type: 'notif',
                        platform: 'apple'
                    }),
                    headers: {
                        'apns-priority': '10'
                    }
                });
            });
        });
    });

    describe('when we want to generate push muted notification payload', () => {
        describe('and notification platform is fcm', () => {
            test('then it should return the correct payload', async () => {
                const result = await pushNotificationStub.generatePushNotificationPayload('gcm', {
                    title: 'test',
                    body: 'test',
                    message: 'testMessage',
                    type: 'notif',
                    sender: {},
                    appVersion: '1.9.1 (1)',
                    isMuted: true,
                    patientId: 1
                });
                expect(result).toStrictEqual({
                    body: JSON.stringify({
                        message: {
                            data: {
                                body: 'test',
                                message: 'test',
                                type: 'notif',
                                patientId: '1',
                                title: 'test'
                            },
                            android: {
                                priority: 'high'
                            }
                        }
                    })
                });
            });
        });

        describe('and notification platform is apple', () => {
            test('then it should return the correct payload', async () => {
                const result = await pushNotificationStub.generatePushNotificationPayload('apple', {
                    title: 'test',
                    body: 'test',
                    message: 'testMessage',
                    sender: '1234',
                    type: 'notif',
                    isMuted: true
                });
                expect(result).toStrictEqual({
                    body: JSON.stringify({
                        aps: {
                            'content-available': 1
                        },
                        expiry: '2023-01-01T06:00:00.000Z',
                        message: 'testMessage',
                        sender: '1234',
                        type: 'notif',
                        platform: 'apple'
                    }),
                    headers: {
                        'apns-priority': '10'
                    }
                });
            });
        });
    });

    describe('when we want to list registrations by tag', () => {
        test('then it should return the registration array', async () => {
            const notificationHubClient = {
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    };
                })
            };

            const result = await pushNotificationStub.listRegistrationsByTag(
                notificationHubClient,
                '1234'
            );
            expect(result).toStrictEqual([{registrationId: '1234'}]);
        });
    });

    describe('when we want to delete registration', () => {
        test('then it should return an object returned from the logger info function', async () => {
            const notificationHubClient = {
                deleteRegistration: jest.fn(() => Promise.resolve({}))
            };

            const result = await pushNotificationStub.deleteRegistration(
                notificationHubClient,
                '123-456-789'
            );
            expect(result && typeof result === 'object').toBe(true);
        });
    });

    describe('when we want to delete all registrations for a user', () => {
        test('then it should call deleteRegistration function', async () => {
            const notificationHubClient = {
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    };
                }),
                deleteRegistration: jest.fn(() => Promise.resolve({}))
            };
            await pushNotificationStub.removeAllRegisteredUserDevices(
                notificationHubClient,
                '123-456-789'
            );

            expect(notificationHubClient.deleteRegistration).toHaveBeenCalled();
        });
    });
});
