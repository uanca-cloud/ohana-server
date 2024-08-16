let getAsyncIterator,
    publishPatientChatToggle,
    publishLocationChatToggle,
    publishNewChatMessage,
    publishChatReadReceipt,
    publishMuteChatNotifications,
    deviceInfoDao,
    RedisPubSub,
    ohanaShared,
    notificationHub,
    MockWebPubSubServiceClient;

const chatMock = {
    elements: null,
    text: 'Vero velut autus subnecto. Defaeco corrigo bibo. Caveo coaegresco denego.',
    order: 371522,
    priority: 'normal',
    createdAt: '2024-07-03T23:57:11.330Z',
    attachments: [],
    status: 'created',
    id: '01J1XGFQ92NHAC6S1T2MXT49PN',
    metadata: JSON.stringify({foo: 'bar'})
};

const senderUserMock = {
    id: '0380',
    tenant: {},
    role: 'FamilyMember',
    assignRoles: ['FamilyMember'],
    firstName: 'Agustina',
    lastName: 'Smith',
    status: 'created',
    title: ''
};

const subscriptionPayloadMock = {
    __typeName: 'NewChatMessageUpdate',
    patientId: 1,
    chat: {
        id: '01J2WT4DCEDP61PWKNJMYM7M7E',
        order: 1234567,
        text: 'Amiculum vos abbas compello suasoria.',
        sentBy: {
            userId: 'e671b4a5-8147-423c-b7cf-3fddb508767b',
            firstName: 'John',
            lastName: 'Doe',
            role: 'FamilyMember',
            title: 'RN'
        },
        createdAt: '2024-07-16T03:42:13.902Z',
        status: 'created',
        metadata:
            '{"1.2.3.4.5.6.1234.1.2.3":{"mobileMessageId":"1234"},"1.3.6.1.4.1.50624.1.2.6":{"senderDeviceId":"1234567890"}}'
    }
};

const deviceIdListMock = [
    {
        userId: 1,
        firstName: 'Jessy',
        lastName: 'Johns',
        roles: ['FamilyMember'],
        deviceId: 'eu2wv_Device',
        notificationPlatform: 'apns',
        appVersion: '1.0',
        notificationLevel: 'mute'
    },
    {
        userId: 2,
        firstName: 'Norbert',
        lastName: 'Carroll',
        roles: ['FamilyMember'],
        deviceId: '45746_Device',
        notificationPlatform: 'apns',
        appVersion: '1.0',
        notificationLevel: 'loud'
    }
];
beforeEach(() => {
    process.env.BAXTER_ENV = 'local';
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared')
    }));

    jest.mock('graphql-redis-subscriptions', () => {
        function RedisPubSub() {}

        RedisPubSub.prototype.asyncIterator = jest.fn();
        RedisPubSub.prototype.publish = jest.fn();
        return {RedisPubSub};
    });
    jest.mock('./PublisherHelper', () => ({
        queue: async (cb) => {
            await cb();
        },
        createSubscriptionPayload: jest.fn(() => {}),
        createPushNotificationPayload: jest.fn(() => {})
    }));
    jest.mock('../user/UserDao', () => ({
        getUsersAndDevicesByPatientId: jest.fn().mockResolvedValue([
            {
                userId: '123-123',
                deviceId: '1234-1234'
            }
        ]),
        getUsersByLocationId: jest.fn().mockResolvedValue([
            {
                userId: '123-123',
                deviceId: '1234-1234'
            }
        ])
    }));
    jest.mock('../SessionService', () => ({
        updateChatCountForPatient: jest.fn().mockResolvedValue({'123-123': 0})
    }));
    jest.mock('../device/DeviceInfoDao', () => ({
        getDeviceIdsFromUserIds: jest.fn().mockResolvedValue([
            {
                userId: '123-123',
                deviceId: '1234-1234',
                firstName: 'John',
                lastName: 'Dexter',
                notificationPlatform: 'apns',
                appVersion: '1.0.0'
            }
        ]),
        getDeviceIdsAndNotificationLevelsFromUserIds: jest.fn().mockResolvedValue([
            {
                userId: '123-888',
                firstName: 'Grover',
                lastName: 'Rosenbaum',
                roles: ['FamilyMember'],
                deviceId: 'tzy52_Device',
                notificationPlatform: 'apns',
                appVersion: '1.0',
                notificationLevel: 'mute'
            }
        ])
    }));

    jest.mock('../AzureNotificationHubGateway', () => ({
        createNotificationHub: jest.fn(),
        generatePushNotificationPayload: jest.fn(),
        sendPushNotification: jest.fn()
    }));

    jest.mock('./AzurePubSubClient', () => ({
        hasPubSubConnection: jest.fn()
    }));

    jest.mock('@azure/web-pubsub', () => {
        return {
            WebPubSubServiceClient: jest.fn().mockImplementation(() => MockWebPubSubServiceClient)
        };
    });

    getAsyncIterator = require('./ChatUpdatePublisher').getAsyncIterator;
    publishPatientChatToggle = require('./ChatUpdatePublisher').publishPatientChatToggle;
    publishLocationChatToggle = require('./ChatUpdatePublisher').publishLocationChatToggle;
    publishNewChatMessage = require('./ChatUpdatePublisher').publishNewChatMessage;
    publishChatReadReceipt = require('./ChatUpdatePublisher').publishChatReadReceipt;
    publishMuteChatNotifications = require('./ChatUpdatePublisher').publishMuteChatNotifications;
    RedisPubSub = require('graphql-redis-subscriptions').RedisPubSub;
    deviceInfoDao = require('../device/DeviceInfoDao');
    notificationHub = require('../AzureNotificationHubGateway');

    ohanaShared = require('ohana-shared');
});

afterEach(() => {
    jest.clearAllMocks();
    jest.unmock('ohana-shared');
});

describe('Given we want to retrieve the async iterator', () => {
    describe('When we have a device ID', () => {
        test('Then we return the async iterator', () => {
            getAsyncIterator('device_id');
            expect(RedisPubSub.prototype.asyncIterator).toHaveBeenCalledTimes(1);
        });
    });
});

describe('Given we want to publish the event for patient toggle', () => {
    describe('When we have recipients', () => {
        test('Then we publish the event to the recipients', async () => {
            await publishPatientChatToggle(1, false, 'device_id');
            expect(RedisPubSub.prototype.publish).toBeCalled();
        });
    });
});

describe('Given we want to publish the event for location toggle', () => {
    describe('When we have recipients', () => {
        test('Then we publish the event to the recipients', async () => {
            await publishLocationChatToggle(1, false);
            expect(RedisPubSub.prototype.publish).toBeCalled();
        });
    });
});

describe('Given we want to publish the event for a new message', () => {
    describe('When we have recipients', () => {
        describe('When the recipient does have an active Web PubSub connection', () => {
            it('Then we publish the event to the recipients', async () => {
                ohanaShared.hasPubSubConnection.mockResolvedValueOnce(true);
                ohanaShared.createSubscriptionPayload.mockReturnValue(subscriptionPayloadMock);
                await publishNewChatMessage(1, chatMock, senderUserMock, [1, 2]);
                expect(RedisPubSub.prototype.publish).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('When there are no recipients', () => {
        it('Then the publish function is not called', async () => {
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(true);
            ohanaShared.createSubscriptionPayload.mockReturnValue(subscriptionPayloadMock);
            deviceInfoDao.getDeviceIdsAndNotificationLevelsFromUserIds.mockResolvedValue([]);
            await publishNewChatMessage(1, chatMock, senderUserMock, [1, 2]);
            expect(RedisPubSub.prototype.publish).not.toBeCalled();
        });
    });

    describe('When we have recipients', () => {
        describe('When the recipient doest not have active Web PubSub connection', () => {
            it('Then we distribute the event to the recipients through the notification hub.', async () => {
                ohanaShared.hasPubSubConnection.mockResolvedValueOnce(false);
                ohanaShared.createSubscriptionPayload.mockReturnValue(subscriptionPayloadMock);
                deviceInfoDao.getDeviceIdsAndNotificationLevelsFromUserIds.mockResolvedValue(
                    deviceIdListMock
                );
                await publishNewChatMessage(1, chatMock, senderUserMock, [1, 2]);
                expect(notificationHub.sendPushNotification).toHaveBeenCalledTimes(2);
                expect(ohanaShared.createPushNotificationPayload).toHaveBeenCalledTimes(2);
            });
        });

        describe('When the recipient has an active Web PubSub connection and the notification level is set to mute', () => {
            it('Then we distribute the event to the recipients through the notification hub.', async () => {
                ohanaShared.hasPubSubConnection.mockResolvedValueOnce(false);
                ohanaShared.createSubscriptionPayload.mockReturnValue(subscriptionPayloadMock);
                const mutedMockedPayload = deviceIdListMock[0];
                deviceInfoDao.getDeviceIdsAndNotificationLevelsFromUserIds.mockResolvedValue([
                    mutedMockedPayload
                ]);
                await publishNewChatMessage(1, chatMock, senderUserMock, [1, 2]);
                expect(notificationHub.sendPushNotification).toHaveBeenCalledTimes(1);
                expect(ohanaShared.createPushNotificationPayload).toHaveBeenCalledTimes(1);
                expect(ohanaShared.createPushNotificationPayload).toHaveBeenCalledWith({
                    isMuted: true,
                    patientId: 1,
                    recipient: {
                        appVersion: '1.0',
                        deviceId: 'eu2wv_Device',
                        firstName: 'Jessy',
                        lastName: 'Johns',
                        notificationLevel: 'mute',
                        notificationPlatform: 'apns',
                        roles: ['FamilyMember'],
                        userId: 1
                    },
                    senderUser: {
                        assignRoles: ['FamilyMember'],
                        firstName: 'Agustina',
                        id: '0380',
                        lastName: 'Smith',
                        role: 'FamilyMember',
                        status: 'created',
                        tenant: {},
                        title: ''
                    }
                });
            });
        });
    });
});

describe('Given we want to publish the event for read receipts', () => {
    describe('When we have recipients', () => {
        test('Then we publish the event to the recipients', async () => {
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(true);
            await publishChatReadReceipt(1, 1, ['123-123']);
            expect(RedisPubSub.prototype.publish).toBeCalled();
        });
    });

    describe('When there are no recipients', () => {
        test('Then the publish function is not called', async () => {
            ohanaShared.hasPubSubConnection.mockResolvedValueOnce(true);
            deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue([]);
            await publishChatReadReceipt(1, 2, []);
            expect(RedisPubSub.prototype.publish).not.toBeCalled();
        });
    });
});

describe('Given we want to publish the event for notification level update', () => {
    describe('When we have recipients', () => {
        test('Then we publish the event to the recipients', async () => {
            await publishMuteChatNotifications(1, 1, ['123-123']);
            expect(RedisPubSub.prototype.publish).toBeCalled();
        });
    });

    describe('When there are no recipients', () => {
        test('Then the publish function is not called', async () => {
            deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue([]);
            await publishMuteChatNotifications(1, 2, []);
            expect(RedisPubSub.prototype.publish).not.toBeCalled();
        });
    });
});
