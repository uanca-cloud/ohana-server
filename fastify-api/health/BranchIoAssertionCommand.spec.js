let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            AZURE_MEDIA_CONTAINER_NAME: ''
        },
        generateBranchIoUrl: jest.fn(() => {
            return 'http://vf.hrdev.io?invite=branch-82b4a340-7856-4cb4-ad23-7486626b63c7';
        })
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./BranchIoAssertionCommand');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to create a BranchIO connection', () => {
    describe('Given there are no errors', () => {
        test('then the generateBranchIoUrl should generate', async () => {
            await resolver();
            expect(ohanaSharedPackage.generateBranchIoUrl).toBeCalledTimes(1);
        });

        test('then the promise should resolve', async () => {
            await expect(resolver()).resolves.not.toThrow();
        });
    });

    describe('Given there are errors', () => {
        test('then the promise should reject', async () => {
            ohanaSharedPackage.generateBranchIoUrl.mockImplementationOnce(() => null);

            await expect(resolver()).rejects.toThrow();
        });
    });
});
