const Joi = require('joi'),
    {
        CONSTANTS: {
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN,
            PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX,
            LOCATION_SETTINGS_KEYS: {
                PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                ALLOW_SECONDARY_FAMILY_MEMBERS,
                CHAT_LOCATION_ENABLED
            }
        }
    } = require('ohana-shared');

const input = Joi.object()
    .keys({
        locationId: Joi.number().required(),
        key: Joi.string()
            .valid(
                PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                ALLOW_SECONDARY_FAMILY_MEMBERS,
                CHAT_LOCATION_ENABLED
            )
            .required(),
        value: Joi.any()
            .when('key', {
                is: PATIENT_AUTO_UNENROLLMENT_IN_HOURS,
                then: Joi.string()
                    .pattern(/^(([1-9]\d*)|(0+))$/)
                    .custom((value) => {
                        if (
                            parseInt(value) <
                            parseInt(PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN)
                        ) {
                            throw new Error(
                                `value must be greater than or equal to ${PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN}`
                            );
                        }
                        if (
                            parseInt(value) >
                            parseInt(PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX)
                        ) {
                            throw new Error(
                                `value must be less than or equal to ${PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX}`
                            );
                        }

                        return value;
                    })
            })
            .when('key', {
                is: ALLOW_SECONDARY_FAMILY_MEMBERS,
                then: Joi.string().valid('true', 'false')
            })
            .when('key', {
                is: CHAT_LOCATION_ENABLED,
                then: Joi.string().valid('true', 'false')
            })
            .required()
    })
    .required();
const updateLocationSetting = Joi.object().keys({input}).required();

module.exports = updateLocationSetting;
