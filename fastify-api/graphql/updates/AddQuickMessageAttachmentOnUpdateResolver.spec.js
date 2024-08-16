let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(() => {
            return {encounterId: 1, userId: 1};
        }),
        createAttachment: jest.fn(() => ({
            id: 1,
            updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
            encounterId: '1',
            metadata: JSON.stringify([
                {text: 'Smth 21', locale: 'en_US'},
                {text: 'Smth 25', locale: 'en_GB'}
            ]),
            type: 'ohanaSharedPackage'
        })),
        validateUpdate: jest.fn(() => ({
            update: {encounterId: 1, userId: 1},
            encounterId: 1,
            userId: 1
        })),
        getFamilyMembersByPatientId: jest.fn(() => [{preferredLocale: 'en_GB'}]),
        getLocationQuickMessageById: jest.fn(() => [
            {text: 'Smth 21', locale: 'en_US'},
            {text: 'Smth 25', locale: 'en_GB'}
        ]),
        writeLog: jest.fn(() => {}),
        getPatientByEncounterId: jest.fn(() => {
            return {
                id: 1
            };
        })
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./AddQuickMessageAttachmentOnUpdateResolver');
});

afterEach(() => {
    jest.unmock('./AddQuickMessageAttachmentOnUpdateResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to add a quick message attachment to an update', () => {
    describe('when valid input is provided', () => {
        test('then it should return the attachment', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        quickMessageId: 1
                    }
                },
                {userId: 1}
            );

            expect(result).toEqual({
                id: 1,
                type: 'quickMessage',
                encounterId: null,
                originalFilename: null,
                originalUrl: null,
                thumbUrl: null,
                updateId: null,
                quickMessages: [{text: 'Smth 25', locale: 'en_GB'}]
            });
        });

        test('then it should fail if no patient exists', async () => {
            ohanaSharedPackage.getPatientByEncounterId.mockImplementationOnce(() =>
                Promise.resolve(null)
            );
            await expect(
                resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                            id: 1
                        }
                    },
                    {userId: 1}
                )
            ).rejects.toThrow();
        });

        test('then it should fail if no quick message exists', async () => {
            ohanaSharedPackage.getLocationQuickMessageById.mockImplementationOnce(() =>
                Promise.resolve(null)
            );
            await expect(
                resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                            id: 1
                        }
                    },
                    {userId: 1}
                )
            ).rejects.toThrow();
        });

        test('then it should return the quick messages in all family members` languages', async () => {
            ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementation(() => [
                {preferredLocale: 'en_US'},
                {preferredLocale: 'en_GB'},
                {preferredLocale: 'en_GB'}
            ]);

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        quickMessageId: 1
                    }
                },
                {userId: 1}
            );

            expect(result).toEqual({
                id: 1,
                type: 'quickMessage',
                encounterId: null,
                originalFilename: null,
                originalUrl: null,
                thumbUrl: null,
                updateId: null,
                quickMessages: [
                    {text: 'Smth 21', locale: 'en_US'},
                    {text: 'Smth 25', locale: 'en_GB'}
                ]
            });
        });

        test('then it should return the qucik message in the default language when family member`s language is not supported', async () => {
            ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementation(() => [
                {preferredLocale: 'de_DE'}
            ]);

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        quickMessageId: 1
                    }
                },
                {userId: 1}
            );

            expect(result).toEqual({
                id: 1,
                type: 'quickMessage',
                encounterId: null,
                originalFilename: null,
                originalUrl: null,
                thumbUrl: null,
                updateId: null,
                quickMessages: [{text: 'Smth 21', locale: 'en_US'}]
            });
        });
    });

    describe('when quick message matches the fm preferredLocale', () => {
        test('then it should return that quickMessageAttachment and resolve', async () => {
            ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementation(() => [
                {preferredLocale: 'en_US'}
            ]);
            ohanaSharedPackage.getLocationQuickMessageById.mockImplementation(() => [
                {text: 'test 1', locale: 'en_US'}
            ]);
            ohanaSharedPackage.createAttachment.mockImplementation(() => ({
                id: 1,
                updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                encounterId: '1',
                metadata: JSON.stringify([{text: 'test 1', locale: 'en_US'}]),
                type: 'ohanaSharedPackage'
            }));

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        quickMessageId: 1
                    }
                },
                {userId: 1}
            );

            expect(result).toStrictEqual({
                id: 1,
                type: 'quickMessage',
                quickMessages: [{text: 'test 1', locale: 'en_US'}],
                encounterId: null,
                originalFilename: null,
                originalUrl: null,
                thumbUrl: null,
                updateId: null
            });
        });

        test('then since there has been a return then createAttachment functions should be called', async () => {
            ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementation(() => [
                {preferredLocale: 'en_US'}
            ]);
            ohanaSharedPackage.getLocationQuickMessageById.mockImplementation(() => [
                {text: 'test 1', locale: 'en_US'}
            ]);
            ohanaSharedPackage.createAttachment.mockImplementation(() => ({
                id: 1,
                updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                encounterId: '1',
                metadata: JSON.stringify([{text: 'test 1', locale: 'en_US'}]),
                type: 'ohanaSharedPackage'
            }));

            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        id: 1
                    }
                },
                {userId: 1}
            );

            expect(ohanaSharedPackage.createAttachment).toBeCalledTimes(1);
        });
    });

    describe('when an attachment is not found', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.createAttachment.mockImplementationOnce(
                () => new Promise((_resolve, reject) => reject('Error'))
            );
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
                expect(err).toBe('Error');
            }
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
                            updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                            id: 1
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.description).toBe('Invalid encounter id or user id');
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
                            updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                            id: 1
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.description).toBe('Invalid encounter id or user id');
                expect(err.message).toBe('Validation Error');
            }
        });
    });

    describe('when creating an attachment fails', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.createAttachment.mockImplementationOnce(
                () => new Promise((_resolve, reject) => reject('Error'))
            );
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
                expect(err).toBe('Error');
            }
        });
    });

    describe('when family member`s list is empty', () => {
        test('then it should return the quick messages with only the default locale', async () => {
            ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementation(() => []);

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '620dbdc9-1890-4f1f-b89d-bfa900945a99',
                        id: 1,
                        quickMessageId: 1
                    }
                },
                {userId: 1}
            );

            expect(result).toStrictEqual({
                id: 1,
                type: 'quickMessage',
                quickMessages: [{text: 'Smth 21', locale: 'en_US'}],
                encounterId: null,
                originalFilename: null,
                originalUrl: null,
                updateId: null,
                thumbUrl: null
            });
        });
    });
});
