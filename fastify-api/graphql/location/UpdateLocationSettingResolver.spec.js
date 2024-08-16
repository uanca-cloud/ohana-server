let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./UpdateLocationSettingResolver');
    ohanaSharedPackage = require('ohana-shared');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateLocationSetting: jest.fn(() => {
            return {
                key: 'patientAutoUnenrollmentInHours',
                value: '72'
            };
        }),
        publishLocationChatToggle: jest.fn()
    }));
});

afterEach(() => {
    jest.unmock('./UpdateLocationSettingResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get location settings', () => {
    describe('when input is provided', () => {
        test('then it should return the new location', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        locationId: '1',
                        key: ohanaSharedPackage.CONSTANTS.LOCATION_SETTINGS_KEYS
                            .PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                        value: 72
                    }
                },
                {tenantId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    key: ohanaSharedPackage.CONSTANTS.LOCATION_SETTINGS_KEYS
                        .PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                    value: '72'
                })
            );
        });
    });

    describe('when updating the chat enabled flag', () => {
        test('then it should call the notify users function', async () => {
            await resolver(
                null,
                {
                    input: {
                        locationId: '1',
                        key: ohanaSharedPackage.CONSTANTS.LOCATION_SETTINGS_KEYS
                            .CHAT_LOCATION_ENABLED,
                        value: 'true'
                    }
                },
                {tenantId: 1}
            );
            expect(ohanaSharedPackage.publishLocationChatToggle).toHaveBeenCalled();
        });

        test('then it should not call the notify users function in case of error', async () => {
            ohanaSharedPackage.updateLocationSetting.mockRejectedValueOnce(new Error());
            await resolver(
                null,
                {
                    input: {
                        locationId: '1',
                        key: ohanaSharedPackage.CONSTANTS.LOCATION_SETTINGS_KEYS
                            .CHAT_LOCATION_ENABLED,
                        value: 'true'
                    }
                },
                {tenantId: 1}
            );
            expect(ohanaSharedPackage.publishLocationChatToggle).not.toHaveBeenCalled();
        });
    });
});
