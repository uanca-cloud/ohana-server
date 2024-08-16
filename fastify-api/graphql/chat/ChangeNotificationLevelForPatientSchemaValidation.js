const Joi = require('joi');
const {
    CONSTANTS: {
        NOTIFICATION_LEVELS: {LOUD, MUTE}
    }
} = require('ohana-shared');

const input = Joi.object()
    .keys({
        patientId: Joi.number().required(),
        notificationLevel: Joi.string().valid(LOUD, MUTE).required()
    })
    .required();

const changeNotificationLevelForPatient = Joi.object().keys({input}).required();

module.exports = changeNotificationLevelForPatient;
