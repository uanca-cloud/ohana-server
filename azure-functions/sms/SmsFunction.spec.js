let resolver = null;

beforeEach(() => {
    resolver = require('./SmsFunction');
});

afterEach(() => {
    jest.unmock('./SmsFunction');
});

describe('Give we want to send a sms', () => {
    let context = null,
        myQueueItem = null;

    beforeEach(() => {
        (context = {
            done: jest.fn(),
            bindings: {
                message: {
                    body: '',
                    to: ''
                }
            }
        }),
            (myQueueItem = JSON.stringify({
                msg: 'test message',
                phoneNumber: '1234567890'
            }));
    });
    test('then context should be called', () => {
        resolver(context, myQueueItem);

        expect(context.done).toBeCalledTimes(1);
    });
});
