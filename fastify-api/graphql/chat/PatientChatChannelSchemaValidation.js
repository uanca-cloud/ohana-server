const Joi = require('joi');

const patientChatChannel = Joi.object()
    .keys({
        patientId: Joi.number().required()
    })
    .required();

module.exports = patientChatChannel;
