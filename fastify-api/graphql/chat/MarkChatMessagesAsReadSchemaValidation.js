const Joi = require('joi');

const input = Joi.object()
    .keys({
        patientId: Joi.number().required(),
        orderNumbers: Joi.array().min(1).items(Joi.number()).required()
    })
    .required();

const markChatMessagesAsRead = Joi.object().keys({input}).required();

module.exports = markChatMessagesAsRead;
