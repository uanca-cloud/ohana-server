const Joi = require('joi');

const chatHistory = Joi.object()
    .keys({
        patientId: Joi.number().required(),
        limit: Joi.number().required(),
        cursor: Joi.string()
    })
    .required();

module.exports = chatHistory;
