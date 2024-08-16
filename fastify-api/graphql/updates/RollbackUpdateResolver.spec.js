const {ValidationError} = require('ohana-shared');
let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        delRedisCollectionData: jest.fn(() => true),
        getRedisCollectionData: jest.fn(() => {
            return {encounterId: 1, userId: 1};
        }),
        getAttachmentsByUpdateId: jest.fn(() => [
            {
                id: '2323232232',
                updateId: '411242114212',
                thumbUrl: 'thumbnailurl',
                originalUrl: 'originalurl',
                filename: 'filename',
                type: 'image/jpeg'
            }
        ]),
        removeAttachmentById: jest.fn(() => true),
        bootstrapStorageAccount: jest.fn(() => {
            return {
                deleteBlob: jest.fn(() => true)
            };
        }),
        removalStrategies: jest.fn(() => true),
        writeLog: jest.fn(() => {}),
        validateUpdate: jest.fn()
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./RollbackUpdateResolver');
});

afterAll(() => {
    jest.unmock('./RollbackUpdateResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to create an update', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    encounterId: 1,
                    updateId: '411242114212'
                },
                {userId: 1}
            );

            expect(result).toBe(true);
        });
    });

    describe('when encounter id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => ({
                encounterId: 2,
                userId: 1
            }));
            ohanaSharedPackage.validateUpdate.mockImplementationOnce(() => {
                throw new ValidationError({description: 'Invalid encounter id or user id'});
            });
            try {
                await resolver(
                    null,
                    {
                        encounterId: 1,
                        updateId: '411242114212'
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
            ohanaSharedPackage.validateUpdate.mockImplementationOnce(() => {
                throw new ValidationError({description: 'Invalid encounter id or user id'});
            });
            try {
                await resolver(
                    null,
                    {
                        encounterId: 1,
                        updateId: '411242114212'
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
        test('then it should delete ohanaSharedPackage entry', async () => {
            ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementationOnce(() => []);
            const result = await resolver(
                null,
                {
                    encounterId: 1,
                    updateId: '411242114212'
                },
                {userId: 1}
            );
            expect(result).toBe(true);
        });
    });

    describe('when encounter ids do not match', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.validateUpdate.mockImplementationOnce(() => {
                throw new ValidationError({description: 'Invalid encounter id or user id'});
            });
            resolver(
                null,
                {
                    encounterId: 2,
                    updateId: '411242114212'
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('VALIDATION_ERROR');
                });
        });
    });
});
