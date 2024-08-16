beforeEach(() => {
    jest.mock('fs');

    jest.mock('util', () => ({
        promisify: jest.fn(() => ({
            bind: jest.fn(() => jest.fn(() => 'testData1, testData2, testData3'))
        }))
    }));
});

afterEach(() => {
    jest.unmock('fs');
});

describe('Given we want add data to a csv file', () => {
    const path = '/test/path/',
        data = ['testData1', 'testData2', 'testData3'];

    test('then the row.joinshould be called to create the data', async () => {
        const {appendToCsvFile} = require('./CsvHelper');
        const result = await appendToCsvFile(path, data);

        expect(result).toEqual('testData1, testData2, testData3');
    });
});
