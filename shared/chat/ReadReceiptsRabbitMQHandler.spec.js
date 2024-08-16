let patientDao,
    deviceInfoDao,
    readReceiptsUpdatePublisher,
    sessionService,
    readReceiptsRabbitMQHandler;

const seed = 'vf:patient:1234',
    recipients = [
        {identity: 'hrc:product_oid:user_1', notificationLevel: 'mute'},
        {identity: 'hrc:product_oid:user_2', notificationLevel: 'loud'}
    ],
    orderNumber = 1234;

beforeEach(() => {
    jest.mock('../patient/PatientDao');
    jest.mock('../device/DeviceInfoDao');
    jest.mock('../pubsub/ReadReceiptsUpdatePublisher');
    jest.mock('../SessionService');

    patientDao = require('../patient/PatientDao');
    deviceInfoDao = require('../device/DeviceInfoDao');
    readReceiptsUpdatePublisher = require('../pubsub/ReadReceiptsUpdatePublisher');
    sessionService = require('../SessionService');
    readReceiptsRabbitMQHandler =
        require('./ReadReceiptsRabbitMQHandler').readReceiptsRabbitMQHandler;
});

afterEach(() => {
    jest.unmock('../patient/PatientDao');
    jest.unmock('../device/DeviceInfoDao');
    jest.unmock('../pubsub/ReadReceiptsUpdatePublisher');
    jest.unmock('../SessionService');
});

describe('Given we want to use the read receipts rabbitmq handler', () => {
    describe('when we call the handler function', () => {
        test('then it fails if there is no patient id retrieved', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue(null);
                await readReceiptsRabbitMQHandler({seed, recipients, orderNumber});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it fails if there is no recipients are found', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue('1');

                recipients[1].notificationLevel = 'mute';
                await readReceiptsRabbitMQHandler({seed, recipients, orderNumber});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it fails if there is no devices are found', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue('1');

                deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue(null);
                recipients[1].notificationLevel = 'loud';

                await readReceiptsRabbitMQHandler({seed, recipients, orderNumber});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it should work', async () => {
            patientDao.getPatientIdFromUlid.mockResolvedValue('1');
            deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue([
                {
                    userId: '1',
                    deviceId: '123'
                }
            ]);
            sessionService.updateChatCountForPatient.mockResolvedValue([{1: 1}]);

            await readReceiptsRabbitMQHandler({seed, recipients, orderNumber});
            expect(readReceiptsUpdatePublisher.publishChatReadReceipt).toHaveBeenCalled();
        });
    });
});
