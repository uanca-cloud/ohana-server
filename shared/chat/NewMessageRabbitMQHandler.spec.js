let patientDao, userDao, deviceInfoDao, chatUpdatePublisher, newMessageRabbitMQHandler;

const seed = 'vf:patient:1234',
    recipients = [
        {identity: 'hrc:product_oid:user_1', notificationLevel: 'mute'},
        {identity: 'hrc:product_oid:user_2', notificationLevel: 'loud'}
    ],
    senderId = 'hrc:product_oid:user_3',
    chat = {
        elements: null,
        text: 'test dummy',
        order: 1,
        priority: 'normal',
        createdAt: '2023-11-15T09:02:34.819Z',
        attachments: [],
        status: 'created',
        id: '62cbb58c-5247-472f-8e19-43614b332ff2',
        metadata:
            '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234", "senderDeviceId": "asdf"}}'
    };

beforeEach(() => {
    jest.mock('../patient/PatientDao');
    jest.mock('../user/UserDao');
    jest.mock('../device/DeviceInfoDao');
    jest.mock('../pubsub/ChatUpdatePublisher');

    patientDao = require('../patient/PatientDao');
    userDao = require('../user/UserDao');
    deviceInfoDao = require('../device/DeviceInfoDao');
    chatUpdatePublisher = require('../pubsub/ChatUpdatePublisher');
    newMessageRabbitMQHandler = require('./NewMessageRabbitMQHandler').newMessageRabbitMQHandler;
});

afterEach(() => {
    jest.unmock('../patient/PatientDao');
    jest.unmock('../user/UserDao');
    jest.unmock('../device/DeviceInfoDao');
    jest.unmock('../pubsub/ChatUpdatePublisher');
});

describe('Given we want to use the new message rabbitmq handler', () => {
    describe('when we call the handler function', () => {
        test('then it fails if there is no patient id retrieved', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue(null);
                await newMessageRabbitMQHandler({seed, recipients, chat, senderId});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it fails if there is no sender id retrieved', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue('1');
                userDao.getChatUserInfoById.mockResolvedValue(null);
                await newMessageRabbitMQHandler({seed, recipients, chat, senderId});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it fails if there is no recipients are found', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue('1');
                userDao.getChatUserInfoById.mockResolvedValue({
                    id: '1',
                    firstName: 'Jon',
                    lastName: 'Doe',
                    role: 'ApprovedUser'
                });
                recipients[1].notificationLevel = 'mute';
                await newMessageRabbitMQHandler({seed, recipients, chat, senderId});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it fails if there is no devices are found', async () => {
            try {
                patientDao.getPatientIdFromUlid.mockResolvedValue('1');
                userDao.getChatUserInfoById.mockResolvedValue({
                    id: '1',
                    firstName: 'Jon',
                    lastName: 'Doe',
                    role: 'ApprovedUser'
                });
                deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue(null);
                recipients[1].notificationLevel = 'loud';

                await newMessageRabbitMQHandler({seed, recipients, chat, senderId});
            } catch (e) {
                expect(e.extensions.code).toBe('NOT_FOUND');
            }
        });

        test('then it should work', async () => {
            patientDao.getPatientIdFromUlid.mockResolvedValue('1');
            userDao.getChatUserInfoById.mockResolvedValue({
                id: '1',
                firstName: 'Jon',
                lastName: 'Doe',
                role: 'ApprovedUser'
            });
            deviceInfoDao.getDeviceIdsFromUserIds.mockResolvedValue([
                {
                    userId: '1',
                    deviceId: '123'
                }
            ]);

            await newMessageRabbitMQHandler({seed, recipients, chat, senderId});
            expect(chatUpdatePublisher.publishNewChatMessage).toHaveBeenCalled();
        });
    });
});
