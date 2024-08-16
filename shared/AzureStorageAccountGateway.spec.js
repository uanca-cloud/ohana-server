beforeEach(() => {
    jest.mock('@azure/storage-blob', () => ({
        ...jest.requireActual('@azure/storage-blob'),
        BlobServiceClient: {
            fromConnectionString: jest.fn().mockReturnValue({
                getContainerClient: jest.fn((containerName) => `returned client ${containerName}`)
            })
        }
    }));

    jest.mock('./constants', () => ({
        AZURE_STORAGE_ACCOUNT_CONNECTION_STRING: '',
        AZURE_STORAGE_ACCOUNT_KEY: '',
        AZURE_STORAGE_ACCOUNT_NAME: '',
        TEMPORARY_TOKEN_TTL_IN_SECS: 60
    }));

    jest.mock('date-fns', () => ({
        addSeconds: jest.fn(() => 75)
    }));
});

afterEach(() => {
    jest.unmock('./constants');
    jest.unmock('date-fns');
    jest.unmock('@azure/storage-blob');
});

describe('Given we want to bootstrap the azure storage account', () => {
    test('then the blob service client should be returned with that container name', () => {
        const {bootstrapStorageAccount} = require('./AzureStorageAccountGateway');
        const containerName = 'test container';
        const result = bootstrapStorageAccount(containerName);

        expect(result).toEqual(`returned client ${containerName}`);
    });
});
