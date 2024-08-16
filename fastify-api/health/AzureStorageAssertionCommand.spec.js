let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            AZURE_MEDIA_CONTAINER_NAME: ''
        },
        bootstrapStorageAccount: jest.fn(() => {
            return {
                getAccessPolicy: jest.fn(() => Promise.resolve(true))
            };
        })
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./AzureStorageAssertionCommand');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to create an azure storage connection', () => {
    describe('Given there are no errors', () => {
        test('then the promise should resolve', async () => {
            await expect(resolver()).resolves.not.toThrow();
        });
    });

    describe('Given there are errors', () => {
        test('then the promise should reject', async () => {
            ohanaSharedPackage.bootstrapStorageAccount.mockImplementationOnce(() => ({
                getAccessPolicy: jest.fn().mockReturnValue(false)
            }));

            await expect(resolver()).rejects;
        });
    });
});
