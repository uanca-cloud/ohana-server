let newMessageRabbitMQHandler, readReceiptsRabbitMQHandler;

const channel = {
        ack: jest.fn()
    },
    message = {fields: {routingKey: '0000.gql.test.watchChannel'}, properties: {type: 'gql'}},
    readReceiptMessage = {
        fields: {routingKey: '0000.gql.test.watchReadReceipt'},
        properties: {type: 'gql'}
    };

beforeEach(() => {
    jest.mock('../chat/NewMessageRabbitMQHandler');
    jest.mock('../chat/ReadReceiptsRabbitMQHandler');

    newMessageRabbitMQHandler =
        require('../chat/NewMessageRabbitMQHandler').newMessageRabbitMQHandler;
    readReceiptsRabbitMQHandler =
        require('../chat/ReadReceiptsRabbitMQHandler').readReceiptsRabbitMQHandler;
});

afterEach(() => {
    jest.unmock('../chat/NewMessageRabbitMQHandler');
    jest.unmock('../chat/ReadReceiptsRabbitMQHandler');
});

describe('Given we want to handle default rmq messages', () => {
    describe('When we receive the message from rmq', () => {
        test('then we acknowledge the message', async () => {
            const {handler} = require('./DefaultSubscriptionHandler');

            await handler(message, channel);
            expect(channel.ack).toHaveBeenCalledWith(message);
        });

        describe('when the message has a watchChannel type', () => {
            test('then we pass it to the new message handler', async () => {
                const {handler} = require('./DefaultSubscriptionHandler');

                const newChatMessage = {
                    ...message,
                    content: Buffer.from(
                        JSON.stringify({
                            data: {
                                watchChannel: {
                                    chat: {
                                        id: '1234'
                                    }
                                }
                            }
                        }),
                        'utf8'
                    )
                };

                await handler(newChatMessage, channel);
                expect(newMessageRabbitMQHandler).toHaveBeenCalled();
            });
        });

        describe('when the message has a watchReadReceipt type', () => {
            test('then we pass it to the new message handler', async () => {
                const {handler} = require('./DefaultSubscriptionHandler');

                const newChatMessage = {
                    ...readReceiptMessage,
                    content: Buffer.from(
                        JSON.stringify({
                            data: {
                                watchReadReceipt: {
                                    seed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                                    orderNumber: 1234,
                                    recipients: ['hrc:1.3.6.1.4.1.50624.1.2.6:1234']
                                }
                            }
                        }),
                        'utf8'
                    )
                };

                await handler(newChatMessage, channel);
                expect(readReceiptsRabbitMQHandler).toHaveBeenCalled();
            });
        });
    });
});
