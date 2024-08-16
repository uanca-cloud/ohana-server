let ohanaSharedPackage = null,
    assertServiceBusConnection = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            PUSSERVICE_BUS_HEALTH_QUEUE_NAMEH_NOTIFICATIONS_TYPES: 'servicebushealth'
        },
        bootstrapAzureServiceBusAdministratorClient: jest.fn(() => {
            return {
                close: jest.fn(() => {})
            }
        }),
        createQueue: jest.fn(() => true),
        checkQueueExists: jest.fn(() => true)
    }));

    ohanaSharedPackage = require('ohana-shared');
    assertServiceBusConnection = require('./AzureServiceBusAssertionCommand');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to create a service bus connection', () => {
    describe('and no error is thrown while creating the queue', () => {
       describe('and queue exists', () => {
           test('then await assertServiceBusConnection should return true', async () => {
               expect(await assertServiceBusConnection()).toBe(true);
               expect(ohanaSharedPackage.createQueue).toBeCalledTimes(1);
               expect(ohanaSharedPackage.checkQueueExists).toBeCalledTimes(1);
           });
       });

        describe('and queue does not exist', () => {
            test('then await assertServiceBusConnection should return false', async () => {
                ohanaSharedPackage.checkQueueExists.mockImplementationOnce(() => false);

                expect(await assertServiceBusConnection()).toBe(false);
            });
        });
    });

    describe('and createQueue throws an error', () => {
       describe('and the error has MessageEntityAlreadyExistsError error code', () => {
           describe('then await assertServiceBusConnection should return true', () => {
               test('then await assertServiceBusConnection should throw', async () => {
                   ohanaSharedPackage.createQueue.mockImplementationOnce(
                       () => {throw {code: 'MessageEntityAlreadyExistsError'}}
                   );

                   expect(await assertServiceBusConnection()).toBe(true);
               });
           });
       });

        describe('and the error has a different error code', () => {
            test('then await assertServiceBusConnection should throw', async () => {
                ohanaSharedPackage.createQueue.mockImplementationOnce(
                    () => {throw {code: 'Error'}}
                );

                await assertServiceBusConnection()
                    .then(() => {
                        fail('Error should occur');
                    })
                    .catch((e) => {
                        expect(e.code).toBe('Error');
                    });
            });
        });
    });
});
