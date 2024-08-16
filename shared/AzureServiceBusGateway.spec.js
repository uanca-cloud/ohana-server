let serviceBusClient = null;

beforeEach(() => {
    jest.mock('@azure/service-bus', () => ({
        ServiceBusClient: jest.fn(() => {
            return {
                createSender: jest.fn(() => {}),
                createReceiver: jest.fn(() => {})
            }
        }),
        ServiceBusAdministrationClient: jest.fn(() => {
            return {
                createQueue: jest.fn(() => {}),
                queueExists: jest.fn(() => true)
            }
        }),
        createSender: jest.fn(() => {
            return {
                sendMessage: jest.fn(() => {}),
                close: jest.fn(() => {})
            }
        }),
        createReceiver: jest.fn(() => {
            return {
                subscribe: jest.fn(() => {}),
                completeMessage: jest.fn(() => {}),
                close: jest.fn(() => {}),
                receiveMessages: jest.fn(() => [])
            }
        }),
        sendMessages: jest.fn((_queueName, _message, cb) => cb(null, {isSuccessful: true})),
        receiveQueueMessage: jest.fn((_queueName, _options, callback) =>
            callback(null, 'test message')
        )
    }));

    serviceBusClient = require('@azure/service-bus');
});

afterEach(() => {
    jest.unmock('@azure/service-bus');
});

describe('Given we want to get the azure service bus sender', () => {
    const queueName = 'test';

    test('then it should return true when getAzureServiceBusSender callback is successful', () => {
        const {getAzureServiceBusSender} = require('./AzureServiceBusGateway');

        const result = getAzureServiceBusSender(serviceBusClient, queueName);
        expect(result).not.toBeNull();
    });
});

describe('Given we want to bootstrap azure service bus client', () => {
    test('then it should return when bootstrapAzureServiceBusClient is successful', () => {
        const {bootstrapAzureServiceBusClient} = require('./AzureServiceBusGateway');

        const result = bootstrapAzureServiceBusClient();
        expect(result).not.toBeNull();
    });
});

describe('Given we want to bootstrap service bus client', () => {
    test('then it should return when bootstrapServiceBusClient is successful', () => {
        const {bootstrapAzureServiceBusClient} = require('./AzureServiceBusGateway');

        const result = bootstrapAzureServiceBusClient();
        expect(result).not.toBeNull();
    });
});

describe('Given we want to bootstrap service bus administrator client', () => {
    test('then it should return when bootstrapAzureServiceBusAdministratorClient is successful', () => {
        const {bootstrapAzureServiceBusAdministratorClient} = require('./AzureServiceBusGateway');

        const result = bootstrapAzureServiceBusAdministratorClient();
        expect(result).not.toBeNull();
    });
});

describe('Given we want to send a message in a queue', () => {
    describe('and no error occurs', () => {
       test('then it should call the close function on the sender object', async () => {
           const close= jest.fn()
           const serviceBusClient = {
               createSender: jest.fn(() => {
                   return {
                       sendMessages: jest.fn(() => Promise.resolve({})),
                       close
                   }
               })
           };
           const {pushMessageInQueue} = require('./AzureServiceBusGateway');

           await pushMessageInQueue(serviceBusClient, 'test_queue', 'test');

           expect(close).toHaveBeenCalledTimes(1);
       });
    });

    describe('and an error occurs', () => {
        test('then it should not call the close function on the sender object', async () => {
            const close= jest.fn()
            const serviceBusClient = {
                createSender: jest.fn(() => {
                    return {
                        close
                    }
                })
            };
            const {pushMessageInQueue} = require('./AzureServiceBusGateway');

            await pushMessageInQueue(serviceBusClient, 'test_queue', 'test');

            expect(close).toHaveBeenCalledTimes(0);
        });
    });
});

describe('Given we want to check if a queue exists', () => {
   describe('and the queue with the given name exists', () => {
       test('then it should return true', async () => {
           const {checkQueueExists} = require('./AzureServiceBusGateway');
           const serviceBusClient = {
               createQueue: jest.fn(() => {}),
               queueExists: jest.fn(() => true)
           };

           const result = await checkQueueExists(serviceBusClient, 'testQueue');

           expect(result).toBe(true);
       });
   });

    describe('and the queue with the given name does not exist', () => {
        test('then it should throw', async () => {
            const {checkQueueExists} = require('./AzureServiceBusGateway');
            const serviceBusClient = {
                createQueue: jest.fn(() => {}),
                queueExists: jest.fn(() => false)
            };

            checkQueueExists(serviceBusClient, 'testQueue')
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.message).toBe('Queue does not exist!');
                });
        });
    });
});

describe('Given we want to create a queue', () => {
    describe('and the queue withe given name exists', () => {
        test('then it should return not null', async () => {
            const {createQueue} = require('./AzureServiceBusGateway');
            const serviceBusClient = {
                createQueue: jest.fn(() => {}),
                queueExists: jest.fn(() => true)
            };

            const result = await createQueue(serviceBusClient, 'testQueue');

            expect(result).not.toBeNull();
        });
    });

});
