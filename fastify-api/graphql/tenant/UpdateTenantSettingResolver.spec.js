let resolver = null;

beforeEach(() => {
    resolver = require('./UpdateTenantSettingResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateTenantSetting: jest.fn(() => true),
        writeLog: jest.fn(() => {})
    }));
});

afterEach(() => {
    jest.unmock('./UpdateTenantSettingResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation update external id type', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        key: 'externalIdType',
                        value: 'MRN'
                    }
                },
                {tenantId: 1}
            );

            expect(result).toEqual(expect.objectContaining({key: 'externalIdType', value: 'MRN'}));
        });
    });
});
