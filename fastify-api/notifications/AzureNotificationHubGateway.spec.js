beforeEach(() => {
    jest.mock('@azure/notification-hubs', () => ({
        NotificationHubsClient: jest.fn(() => {
            return {
                notificationHubId: '123',
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [])
                    };
                })
            };
        }),
        createFcmLegacyNotification: jest.fn(() => {}),
        createAppleNotification: jest.fn(() => {}),
        createFcmV1RegistrationDescription: jest.fn(() => {})
    }));

    jest.mock('ohana-shared', () => ({
        generatePushNotificationPayload: jest.fn(() =>
            Promise.resolve({
                message: {
                    notification: {
                        title: 'title',
                        body: 'body'
                    },
                    data: {
                        message: '',
                        type: 'test'
                    },
                    android: {
                        priority: 'high'
                    }
                }
            })
        )
    }));
});

afterEach(() => {
    jest.unmock('@azure/notification-hubs');
    jest.unmock('ohana-shared');
});

describe('Given we want to bootstrap the notification hub service', () => {
    describe('Given notificationHubService.createRegistrationId does not return an error', () => {
        test('then the azure NotificationHubsClient constructor function should be called', () => {
            const {bootstrapNotificationHubClient} = require('./AzureNotificationHubGateway');
            const result = bootstrapNotificationHubClient();

            expect(result).not.toBeNull();
        });
    });
});

describe('Given we want to register a device to the notification hub service', () => {
    describe('given createOrUpdateRegistration does not return an error', () => {
        const notificationHubClient = {
                createOrUpdateRegistration: jest.fn(() => {}),
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    };
                })
            },
            notificationHubId = '123',
            deviceToken = '123abc',
            userId = 12345,
            logger = {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn()
            };

        describe('and device is gcm', () => {
            test('then the device should register and the promise should be resolved', () => {
                const {registerDevice} = require('./AzureNotificationHubGateway');
                expect(
                    registerDevice(
                        notificationHubClient,
                        'gcm',
                        notificationHubId,
                        deviceToken,
                        userId,
                        logger
                    )
                ).not.toBeNull();
            });
        });

        describe('and device is apple', () => {
            test('then the device should register and the promise should be resolved', () => {
                const {registerDevice} = require('./AzureNotificationHubGateway');
                expect(
                    registerDevice(
                        notificationHubClient,
                        'apple',
                        notificationHubId,
                        deviceToken,
                        userId,
                        logger
                    )
                ).not.toBeNull();
            });
        });
    });
    describe('given createOrUpdateRegistration does return an error', () => {
        const notificationHubClient = {
                createOrUpdateRegistration: jest.fn(() => {}),
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    };
                })
            },
            notificationPlatform = 'test',
            notificationHubId = '123',
            deviceToken = '123abc',
            userId = 12345,
            logger = {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn()
            };

        test('then the error should be returned', () => {
            const {registerDevice} = require('./AzureNotificationHubGateway');
            expect(
                registerDevice(
                    notificationHubClient,
                    notificationPlatform,
                    notificationHubId,
                    deviceToken,
                    userId,
                    logger
                )
            ).not.toBeNull();
        });
    });
});

describe('Given we want to send a message', () => {
    describe('given send does not return an error', () => {
        const notificationHubClient = {
                sendNotification: jest.fn(() => {}),
                listRegistrationsByTag: jest.fn(() => {
                    return {
                        byPage: jest.fn(() => [[{registrationId: '1234'}]])
                    };
                })
            },
            userId = 12345,
            message = {
                data: {
                    message: 'test message'
                }
            },
            logger = {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn()
            };

        describe('and platform is ios', () => {
            test('then the device should send the message and the promise should be resolved', async () => {
                const {sendMessage} = require('./AzureNotificationHubGateway');
                expect(
                    await sendMessage(notificationHubClient, 'apple', userId, message, logger)
                ).not.toBeNull();
            });
        });

        describe('and platform is gcm', () => {
            test('then the device should send the message and the promise should be resolved', async () => {
                const {sendMessage} = require('./AzureNotificationHubGateway');
                expect(
                    await sendMessage(notificationHubClient, 'gcm', userId, message, logger)
                ).not.toBeNull();
            });
        });
    });

    describe('given send does return an error', () => {
        const notificationHubClient = {
                sendNotification: jest.fn(() => {})
            },
            notificationPlatform = 'test',
            userId = 12345,
            message = {
                data: {
                    message: 'test message'
                }
            },
            logger = {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn()
            };

        test('then the error should be returned', async () => {
            const {sendMessage} = require('./AzureNotificationHubGateway');
            expect(
                await sendMessage(
                    notificationHubClient,
                    notificationPlatform,
                    userId,
                    message,
                    logger
                )
            ).not.toBeNull();
        });
    });
});
