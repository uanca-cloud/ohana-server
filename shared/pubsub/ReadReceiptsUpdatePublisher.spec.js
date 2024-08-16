let getReadReceiptsAsyncIterator, publishChatReadReceipt, deviceInfoDao, RedisPubSub;

beforeEach(() => {
    jest.mock('graphql-redis-subscriptions', () => {
        function RedisPubSub() {}

        RedisPubSub.prototype.asyncIterator = jest.fn();
        RedisPubSub.prototype.publish = jest.fn();
        return {RedisPubSub};
    });

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
                deviceId: '1234-1234'
            }
        ])
    }));

    getReadReceiptsAsyncIterator =
        require('./ReadReceiptsUpdatePublisher').getReadReceiptsAsyncIterator;
    publishChatReadReceipt = require('./ReadReceiptsUpdatePublisher').publishChatReadReceipt;
    RedisPubSub = require('graphql-redis-subscriptions').RedisPubSub;
    deviceInfoDao = require('../device/DeviceInfoDao');
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Given we want to retrieve the async iterator', () => {
    describe('When we have a device ID', () => {
        test('Then we return the async iterator', () => {
            getReadReceiptsAsyncIterator('device_id');
            expect(RedisPubSub.prototype.asyncIterator).toHaveBeenCalledTimes(1);
        });
    });
});

describe('Given we want to publish the event for a read receipt', () => {
    describe('When we have recipients', () => {
        test('Then we publish the event to the recipients', async () => {
            await publishChatReadReceipt('123-123', 1, [1]);
            expect(RedisPubSub.prototype.publish).toBeCalled();
        });
    });

    describe('When we have no recipients', () => {
        test('Then we skip the publish', async () => {
            deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue([]);
            await publishChatReadReceipt('123-123', 1, []);
            expect(RedisPubSub.prototype.publish).not.toBeCalled();
        });
    });
});
