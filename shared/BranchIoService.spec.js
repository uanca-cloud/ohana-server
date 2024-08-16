beforeEach(() => {
    jest.mock('./constants', () => ({
        BRANCH_IO_KEY: 'testkey',
        BRANCH_IO_URL: 'http://testUrl/'
    }));
});

afterEach(() => {
    jest.unmock('node-fetch');
    jest.unmock('./constants');
});

describe('Given we want to generate a BranchIo URL', () => {
    describe('given fetch function return resolve', () => {
        beforeEach(() => {
            jest.mock('node-fetch', () => () => ({
                json: jest.fn().mockReturnValue({url: 'http://testUrl/123abc'}),
                ok: true,
                status: 200
            }));
        });

        test('then url should be returned', async () => {
            const {generateBranchIoUrl} = require('./BranchIoService');
            const result = await generateBranchIoUrl('123abc');

            expect(result).toEqual('http://testUrl/123abc');
        });
    });

    describe('given fetch function is rejected', () => {
        beforeEach(() => {
            jest.mock('node-fetch', () => () => ({
                json: jest.fn().mockReturnValue({url: 'http://testUrl/123abc'}),
                ok: false,
                status: 400
            }));
        });

        test('then null should be returned', async () => {
            const {generateBranchIoUrl} = require('./BranchIoService');
            const result = await generateBranchIoUrl('123abc');

            expect(result).toBeNull();
        });
    });
});
