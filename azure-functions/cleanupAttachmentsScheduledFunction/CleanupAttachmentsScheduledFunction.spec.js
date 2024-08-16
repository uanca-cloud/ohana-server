let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(() => {
            return {
                challenge: 'challenge',
                publicKey: 'test'
            };
        }),
        removalStrategies: {
            text: jest.fn(() => true)
        },
        getUncommittedAttachments: jest.fn(() => false),
        bootstrapAzf: jest.fn(() => {}),
        CONSTANTS: {
            REDIS_COLLECTIONS: {CAREGIVER_UPDATES: 'caregiver_updates'}
        }
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CleanupAttachmentsScheduledFunction');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to remove associated attachments', () => {
    describe('given there are no associated attachments', () => {
        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver();

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then getUncommittedAttachments should be called', async () => {
            await resolver();

            expect(ohanaSharedPackage.getUncommittedAttachments).toBeCalledTimes(1);
        });

        test('then getRedisCollectionData should never be called', async () => {
            await resolver();

            expect(ohanaSharedPackage.getRedisCollectionData).not.toBeCalled();
            expect(ohanaSharedPackage.removalStrategies['text']).not.toBeCalled();
        });
    });

    describe('given there are associated caregivers', function () {
        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver();

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then getUncommittedAttachments should be called', async () => {
            await resolver();

            expect(ohanaSharedPackage.getUncommittedAttachments).toBeCalledTimes(1);
        });

        test('then getRedisCollectionData should be called', async () => {
            ohanaSharedPackage.getUncommittedAttachments.mockImplementation(() => {
                return [
                    {
                        updateId: '123',
                        id: 123,
                        originalFilename: 'test',
                        encounterId: 1,
                        type: 'text'
                    }
                ];
            });
            await resolver();

            expect(ohanaSharedPackage.getRedisCollectionData).toBeCalledTimes(1);
        });
    });

    describe('given there is no associated update', function () {
        test('then the removalStrategy should be called', async () => {
            const type = 'text';
            ohanaSharedPackage.getUncommittedAttachments.mockImplementation(() => {
                return [
                    {
                        updateId: '123',
                        id: 123,
                        originalFilename: 'test',
                        encounterId: 1,
                        type
                    }
                ];
            });
            ohanaSharedPackage.getRedisCollectionData.mockImplementation(jest.fn(() => false));
            await resolver();

            expect(ohanaSharedPackage.getRedisCollectionData).toBeCalledTimes(1);
            expect(ohanaSharedPackage.removalStrategies[type]).toBeCalledTimes(1);
        });
    });
});
