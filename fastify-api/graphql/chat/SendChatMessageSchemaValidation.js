const Joi = require('joi');

const input = Joi.object()
    .keys({
        patientId: Joi.number().required(),
        text: Joi.string().max(1024).required(),
        metadata: Joi.string().required()
    })
    .required();

const sendChatMessage = Joi.object().keys({input}).required();

module.exports = sendChatMessage;
