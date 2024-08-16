const updateLocationSetting = require('./UpdateLocationSettingSchemaValidation'),
    {
        CONSTANTS: {
            LOCATION_SETTINGS_KEYS: {
                ALLOW_SECONDARY_FAMILY_MEMBERS,
                CHAT_LOCATION_ENABLED,
                PATIENT_AUTO_UNENROLLMENT_IN_HOURS
            },
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN,
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX,
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT
        }
    } = require('ohana-shared');

describe('Given we want to validate the Graphql schema for update the setting of a location mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocationSetting.validateAsync({
                input: {
                    locationId: 1,
                    key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                    value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT.toString()
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        locationId: 1,
                        key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                        value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT.toString()
                    }
                })
            );
        });
    });

    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocationSetting.validateAsync({
                input: {locationId: 1, key: ALLOW_SECONDARY_FAMILY_MEMBERS, value: 'false'}
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {locationId: 1, key: ALLOW_SECONDARY_FAMILY_MEMBERS, value: 'false'}
                })
            );
        });
    });

    describe('when valid input is provided for chat enabled', () => {
        it('then it should return the updated value', async () => {
            const result = await updateLocationSetting.validateAsync({
                input: {locationId: 1, key: CHAT_LOCATION_ENABLED, value: 'true'}
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {locationId: 1, key: CHAT_LOCATION_ENABLED, value: 'true'}
                })
            );
        });
    });

    describe('and max value is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocationSetting.validateAsync({
                input: {
                    locationId: 1,
                    key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                    value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX.toString()
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        locationId: 1,
                        key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                        value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX.toString()
                    }
                })
            );
        });
    });

    describe('and min value is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocationSetting.validateAsync({
                input: {
                    locationId: 1,
                    key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                    value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN.toString()
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        locationId: 1,
                        key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                        value: PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN.toString()
                    }
                })
            );
        });
    });

    describe('when invalid min value for patientAutoUnenrollmentInHours key is provided', () => {
        it('then it should throw', async () => {
            const value = (PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN - 1).toString();
            await updateLocationSetting
                .validateAsync({
                    input: {locationId: 1, key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS, value}
                })
                .catch((err) =>
                    expect(err.details[0].message).toBe(
                        '"input.value" failed custom validation because value must be greater than or equal to 1'
                    )
                );
        });
    });

    describe('when invalid max value for patientAutoUnenrollmentInHours key is provided', () => {
        it('then it should throw', async () => {
            const value = (PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX + 1).toString();
            await updateLocationSetting
                .validateAsync({
                    input: {locationId: 1, key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS, value}
                })
                .catch((err) =>
                    expect(err.details[0].message).toBe(
                        '"input.value" failed custom validation because value must be less than or equal to 720'
                    )
                );
        });
    });

    describe('when invalid max value for patientAutoUnenrollmentInHours key is provided', () => {
        it('then it should throw', async () => {
            const value = '1000';
            await updateLocationSetting
                .validateAsync({
                    input: {locationId: 1, key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS, value}
                })
                .catch((err) =>
                    expect(err.details[0].message).toBe(
                        '"input.value" failed custom validation because value must be less than or equal to 720'
                    )
                );
        });
    });

    describe('when invalid value that starts with 0 for patientAutoUnenrollmentInHours key is provided', () => {
        it('then it should throw', async () => {
            await updateLocationSetting
                .validateAsync({
                    input: {locationId: 1, key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS, value: '0092'}
                })
                .catch((err) =>
                    expect(err.details[0].message).toBe(
                        '"input.value" with value "0092" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                    )
                );
        });
    });

    describe('when invalid value that contains multiple 0 for patientAutoUnenrollmentInHours key is provided', () => {
        it('then it should throw', async () => {
            await updateLocationSetting
                .validateAsync({
                    input: {locationId: 1, key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS, value: '00'}
                })
                .catch((err) =>
                    expect(err.details[0].message).toBe(
                        '"input.value" failed custom validation because value must be greater than or equal to 1'
                    )
                );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updateLocationSetting
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await updateLocationSetting
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"input.locationId" is required');
                        expect(err.details[1].message).toBe('"input.key" is required');
                        expect(err.details[2].message).toBe('"input.value" is required');
                    });
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await updateLocationSetting
                    .validateAsync({input: {locationId: 'ssss', key: 'keyname', value: 'value'}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.locationId" must be a number')
                    );
            });
        });

        describe('and numbers are provides instead of strings', () => {
            it('then it should throw', async () => {
                await updateLocationSetting
                    .validateAsync({input: {locationId: 1, key: 1, value: 1}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe(
                            '"input.key" must be one of [patientAutoUnenrollmentInHours, allowSecondaryFamilyMembers, chatLocationEnabled]'
                        );
                        expect(err.details[1].message).toBe('"input.key" must be a string');
                    });
            });
        });

        describe('and float number is provided instead of integer', () => {
            it('then it should throw', async () => {
                await updateLocationSetting
                    .validateAsync({
                        input: {
                            locationId: 1,
                            key: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                            value: '10.8'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.value" with value "10.8" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                        )
                    );
            });
        });
    });
});
