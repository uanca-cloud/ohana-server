let resolver = null;

beforeEach(() => {
    resolver = require('./LocationSettingsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getLocationSettings: jest.fn(() => {
            return {
                key: 'patientAutoUnenrollmentInHours',
                value: '72'
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./LocationSettingsResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get location settings', () => {
    describe('when input is provided', () => {
        test('then it should return the new location', async () => {
            const result = await resolver(
                null,
                {
                    locationId: 1
                },
                {tenantId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    key: 'patientAutoUnenrollmentInHours',
                    value: '72'
                })
            );
        });
    });
});
