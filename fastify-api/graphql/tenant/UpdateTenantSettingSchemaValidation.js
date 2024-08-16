const Joi = require('joi'),
    {
        CONSTANTS: {
            AUDIT_RETENTION_IN_DAYS_MIN,
            AUDIT_RETENTION_IN_DAYS_MAX,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX,
            MIN_FAMILY_MEMBER_LIMIT,
            MAX_FAMILY_MEMBER_LIMIT,
            TENANT_SETTINGS_KEYS,
            TENANT_SETTINGS_KEYS: {
                FREE_TEXT_FLAG,
                MEDIA_ATTACHMENT_FLAG,
                EXTERNAL_ID_TYPE,
                OUTBOUND_CALL_FORMAT,
                AUDIT_RETENTION,
                CAREGIVER_SESSION_INACTIVITY,
                FAMILY_MEMBER_SESSION_INACTIVITY,
                FAMILY_MEMBER_LIMIT,
                ANALYTICS_FLAG,
                FREE_TEXT_TRANSLATION_FLAG
            }
        }
    } = require('ohana-shared');

const input = Joi.object()
    .keys({
        key: Joi.string()
            .valid(...Object.values(TENANT_SETTINGS_KEYS))
            .required(),
        value: Joi.any()
            .when('key', {
                is: AUDIT_RETENTION,
                then: Joi.string()
                    .pattern(/^(([1-9]\d*)|(0+))$/)
                    .custom((value) => {
                        if (parseInt(value) < parseInt(AUDIT_RETENTION_IN_DAYS_MIN)) {
                            throw new Error(
                                `value must be greater than or equal to ${AUDIT_RETENTION_IN_DAYS_MIN}`
                            );
                        }
                        if (parseInt(value) > parseInt(AUDIT_RETENTION_IN_DAYS_MAX)) {
                            throw new Error(
                                `value must be less than or equal to ${AUDIT_RETENTION_IN_DAYS_MAX}`
                            );
                        }

                        return value;
                    })
            })
            .when('key', {
                is: CAREGIVER_SESSION_INACTIVITY,
                then: Joi.string()
                    .pattern(/^(([1-9]\d*)|(0+))$/)
                    .custom((value) => {
                        if (parseInt(value) < parseInt(CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN)) {
                            throw new Error(
                                `value must be greater than or equal to ${CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN}`
                            );
                        }
                        if (parseInt(value) > parseInt(CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX)) {
                            throw new Error(
                                `value must be less than or equal to ${CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX}`
                            );
                        }

                        const maxNumberOfDigits =
                            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX.toString().length;
                        const actualNumberOfDigits = value.length;

                        if (actualNumberOfDigits > maxNumberOfDigits && parseInt(value) !== 0) {
                            throw new Error(
                                `value must be less than or equal to ${CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX}`
                            );
                        }

                        return value;
                    })
            })
            .when('key', {
                is: FAMILY_MEMBER_SESSION_INACTIVITY,
                then: Joi.string()
                    .pattern(/^(([1-9]\d*)|(0+))$/)
                    .custom((value) => {
                        if (
                            parseInt(value) <
                            parseInt(FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN)
                        ) {
                            throw new Error(
                                `value must be greater than or equal to ${FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN}`
                            );
                        }
                        if (
                            parseInt(value) >
                            parseInt(FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX)
                        ) {
                            throw new Error(
                                `value must be less than or equal to ${FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX}`
                            );
                        }

                        const maxNumberOfDigits =
                            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX.toString().length;
                        const actualNumberOfDigits = value.length;

                        if (actualNumberOfDigits > maxNumberOfDigits && parseInt(value) !== 0) {
                            throw new Error(
                                `value must be less than or equal to ${FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX}`
                            );
                        }

                        return value;
                    })
            })
            .when('key', {
                is: OUTBOUND_CALL_FORMAT,
                then: Joi.string()
                    .pattern(/(\${phoneNumber})/)
                    .required()
            })
            .when('key', {is: EXTERNAL_ID_TYPE, then: Joi.string().required()})
            .when('key', {
                is: FAMILY_MEMBER_LIMIT,
                then: Joi.string()
                    .pattern(/^(([1-9]\d*)|(0+))$/)
                    .custom((value) => {
                        if (parseInt(value) < parseInt(MIN_FAMILY_MEMBER_LIMIT)) {
                            throw new Error(
                                `value must be greater than or equal to ${MIN_FAMILY_MEMBER_LIMIT}`
                            );
                        }
                        if (parseInt(value) > parseInt(MAX_FAMILY_MEMBER_LIMIT)) {
                            throw new Error(
                                `value must be less than or equal to ${MAX_FAMILY_MEMBER_LIMIT}`
                            );
                        }

                        const maxNumberOfDigits = MAX_FAMILY_MEMBER_LIMIT.toString().length;
                        const actualNumberOfDigits = value.length;

                        if (actualNumberOfDigits > maxNumberOfDigits && parseInt(value) !== 0) {
                            throw new Error(
                                `value must be less than or equal to ${MAX_FAMILY_MEMBER_LIMIT}`
                            );
                        }

                        return value;
                    })
            })
            .required()
            .when('key', {is: FREE_TEXT_FLAG, then: Joi.string().valid('true', 'false')})
            .when('key', {is: MEDIA_ATTACHMENT_FLAG, then: Joi.string().valid('true', 'false')})
            .when('key', {is: ANALYTICS_FLAG, then: Joi.string().valid('true', 'false')})
            .when('key', {
                is: FREE_TEXT_TRANSLATION_FLAG,
                then: Joi.string().valid('true', 'false')
            })
    })
    .required();

const updateTenantSetting = Joi.object().keys({input}).required();

module.exports = updateTenantSetting;
