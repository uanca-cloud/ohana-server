let createPushNotificationPayload, createSubscriptionPayload;

const {queue, clearQueue} = require('./PublisherHelper');

const callback = jest.fn().mockImplementation(function* () {
    yield true;
    return Promise.resolve(true);
});

const chatMock = {
    elements: null,
    text: 'Vero velut autus subnecto. Defaeco corrigo bibo. Caveo coaegresco denego.',
    order: 371522,
    cursor: 123,
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
    patientRelationship: 'Sibling',
    lastName: 'Smith',
    status: 'created',
    title: ''
};

const recipientsListMock = [
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
        notificationPlatform: 'gcm',
        appVersion: '1.0',
        notificationLevel: 'loud'
    }
];

const applePushNotificationMutedMocked = {
    body: '{"aps":{"content-available":1},"expiry":"2024-07-20T10:20:30.000Z","sender":{"firstName":"Agustina","lastName":"Smith","title":""},"type":"CHAT","patientId":1,"platform":"apple"}',
    headers: {'apns-priority': '10'},
    platform: 'apple',
    contentType: 'application/json;charset=utf-8'
};

const applePushNotificationLoudMocked = {
    body: '{"aps":{"sound":"default","alert":{"title":"New Message","body":"There is a new message from Agustina, Sibling."}},"expiry":"2024-07-20T10:20:30.000Z","sender":{"firstName":"Agustina","lastName":"Smith","title":""},"type":"CHAT","patientId":1,"platform":"apple"}',
    headers: {'apns-priority': '10'},
    platform: 'apple',
    contentType: 'application/json;charset=utf-8'
};

const androidPushNotificationLoudMocked = {
    body: '{"message":{"notification":{"title":"New Message","body":"There is a new message from Agustina, Sibling."},"data":{"title":"New Message","body":"There is a new message from Agustina, Sibling.","message":"There is a new message from Agustina, Sibling.","firstName":"Agustina","lastName":"Smith","type":"CHAT","patientId":"1"},"android":{"priority":"high"}}}',
    platform: 'fcmv1',
    contentType: 'application/json;charset=utf-8'
};

const androidPushNotificationMutedMocked = {
    body: '{"message":{"data":{"body":"There is a new message from Agustina, Sibling.","message":"There is a new message from Agustina, Sibling.","firstName":"Agustina","lastName":"Smith","title":"New Message","type":"CHAT","patientId":"1"},"android":{"priority":"high"}}}',
    platform: 'fcmv1',
    contentType: 'application/json;charset=utf-8'
};

const subscriptionPayloadMock = {
    __typeName: 'NewChatMessageUpdate',
    patientId: 1,
    chat: {
        id: '01J1XGFQ92NHAC6S1T2MXT49PN',
        order: 371522,
        cursor: 123,
        text: 'Vero velut autus subnecto. Defaeco corrigo bibo. Caveo coaegresco denego.',
        sentBy: {
            userId: '0380',
            firstName: 'Agustina',
            lastName: 'Smith',
            role: 'FamilyMember',
            title: '',
            patientRelationship: 'Sibling'
        },
        createdAt: '2024-07-03T23:57:11.330Z',
        status: 'created',
        metadata: '{"foo":"bar"}'
    }
};

beforeEach(() => {
    jest.mock('date-fns/addSeconds', () => {
        return jest.fn(() => new Date('2024-07-20T10:20:30Z'));
    });
    createPushNotificationPayload = require('./PublisherHelper').createPushNotificationPayload;
    createSubscriptionPayload = require('./PublisherHelper').createSubscriptionPayload;
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Given we want to debounce one method from another', () => {
    describe('When callbacks are built correctly', () => {
        test('Then we should get the proper execution done first', () => {
            jest.useFakeTimers();
            jest.spyOn(global, 'setImmediate');
            queue(callback);
            expect(callback).not.toHaveBeenCalled();
            jest.runAllTimers();
            expect(setImmediate).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
});

describe('Given we want to clear the array', () => {
    describe('When we have values for set immediate ids', () => {
        test('then we call clearImmediate for each id', () => {
            jest.useFakeTimers();
            jest.spyOn(global, 'clearImmediate');
            queue(callback);
            jest.runAllTimers();
            clearQueue();
            expect(clearImmediate).toHaveBeenCalledTimes(1);
            jest.useRealTimers();
        });
    });
});

describe('Given we want to create a push notification payload', () => {
    describe('When the platform is Apple and the notification level is muted', () => {
        test('Then we return a formatted chat message', async () => {
            const result = await createPushNotificationPayload({
                senderUser: senderUserMock,
                recipient: recipientsListMock[0],
                patientId: 1,
                isMuted: true
            });

            expect(result).toEqual(applePushNotificationMutedMocked);
        });
    });
    describe('When the platform is Apple and the notification level is loud', () => {
        test('Then we return a formatted chat message', async () => {
            const result = await createPushNotificationPayload({
                senderUser: senderUserMock,
                recipient: recipientsListMock[0],
                patientId: 1,
                isMuted: false
            });

            expect(result).toEqual(applePushNotificationLoudMocked);
        });
    });
    describe('When the platform is Android and the notification level is loud', () => {
        test('Then we return a formatted chat message', async () => {
            const result = await createPushNotificationPayload({
                senderUser: senderUserMock,
                recipient: recipientsListMock[1],
                patientId: 1,
                isMuted: false
            });

            expect(result).toEqual(androidPushNotificationLoudMocked);
        });
    });
    describe('When the platform is Android and the notification level is muted', () => {
        test('Then we return a formatted chat message', async () => {
            const result = await createPushNotificationPayload({
                senderUser: senderUserMock,
                recipient: recipientsListMock[1],
                patientId: 1,
                isMuted: true
            });

            expect(result).toEqual(androidPushNotificationMutedMocked);
        });
    });
});

describe('Given we want to create a subscription payload', () => {
    test('Then we return a subscription payload', async () => {
        const result = await createSubscriptionPayload({
            chat: chatMock,
            senderUser: senderUserMock,
            patientId: 1
        });

        expect(result).toEqual(subscriptionPayloadMock);
    });
});
