let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapStorageAccount: jest.fn(() => {
            return {
                deleteBlob: jest.fn(() => true)
            };
        }),
        getRedisCollectionData: jest.fn(() => {
            return {encounterId: 1, userId: 1};
        }),
        getAttachmentById: jest.fn(() => ({type: 'photo'})),
        removalStrategies: jest.fn(() => true),
        writeLog: jest.fn(() => {}),
        validateUpdate: jest.fn()
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./RemoveAttachmentOnUpdateResolver');
});

afterAll(() => {
    jest.unmock('./RemoveAttachmentOnUpdateResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to remove an attachment from an update', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                        id: '91c60525-5799'
                    }
                },
                {userId: 1}
            );

            expect(result).toBe(true);
        });
    });

    describe('when could not remove attachment', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.bootstrapStorageAccount.mockImplementationOnce(() => ({
                deleteBlob: () => new Promise((_resolve, reject) => reject('Error'))
            }));

            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                        id: '91c60525-5799'
                    }
                },
                {userId: 1}
            );

            await expect(ohanaSharedPackage.bootstrapStorageAccount.deleteBlob).rejects;
        });
    });

    describe('when encounter id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => ({
                encounterId: 2,
                userId: 1
            }));
            try {
                await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                            id: '91c60525-5799'
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Invalid encounter id or user id');
                expect(err.message).toBe('Validation Error');
            }
        });
    });

    describe('when user id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => ({
                encounterId: 1,
                userId: 2
            }));
            try {
                await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                            id: '91c60525-5799'
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Invalid encounter id or user id');
                expect(err.message).toBe('Validation Error');
            }
        });
    });

    describe('when no attachment is found', () => {
        test('then it should return false', async () => {
            ohanaSharedPackage.getAttachmentById.mockImplementationOnce(() => null);
            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                        id: '91c60525-5799'
                    }
                },
                {userId: 1}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });
});
