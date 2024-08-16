const {getKeysByTenant} = require('./AzureAppConfigGateway');

jest.mock('@azure/app-configuration', () => ({
    ...jest.requireActual('@azure/app-configuration'),
    AppConfigurationClient: function () {
        return {
            listConfigurationSettings: jest.fn(() => ({
                next: () => jest.fn(),
                async *[Symbol.asyncIterator]() {
                    const keys = [
                        'CSA_HTTP_CREDENTIAL',
                        'CSA_HTTP_SECRET',
                        'CSA_RMQ_CREDENTIAL',
                        'CSA_RMQ_SECRET'
                    ];
                    for (let i = 0; i < 4; i++) {
                        yield {key: keys[i], value: 'test', label: '00JL'};
                    }
                }
            }))
        };
    }
}));

afterAll(() => {
    jest.unmock('@azure/app-configuration');
});

describe('Given we want to retrieve credentials from the app config', () => {
    describe('When we have the tenant short code', () => {
        test('it should match the label', () => {
            expect(getKeysByTenant('00JL')).resolves.toEqual({
                http: {credential: 'test', secret: 'test'},
                rmq: {credential: 'test', secret: 'test'}
            });
        });
    });
});
