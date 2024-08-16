const Joi = require('joi');

const input = Joi.object().keys({
    patientId: Joi.number().required(),
    chatPatientEnabled: Joi.boolean().required()
});

const toggleChatForPatient = Joi.object().keys({input}).required();

module.exports = toggleChatForPatient;
