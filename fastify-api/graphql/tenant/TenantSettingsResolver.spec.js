let resolver = null;

beforeEach(() => {
    resolver = require('./TenantSettingsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getTenantSettings: jest.fn(() => {
            return {
                key: 'externalIdType',
                value: 'MRN'
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./TenantSettingsResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get tenant settings', () => {
    describe('when input is provided', () => {
        test('then it should return the new location', async () => {
            const result = await resolver(null, {}, {tenantId: 1});

            expect(result).toEqual(
                expect.objectContaining({
                    key: 'externalIdType',
                    value: 'MRN'
                })
            );
        });
    });
});
