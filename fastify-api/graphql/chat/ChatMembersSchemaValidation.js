const Joi = require('joi');

const chatMembers = Joi.object()
    .keys({
        patientId: Joi.number().required(),
        limit: Joi.number().required(),
        offset: Joi.number().required()
    })
    .required();

module.exports = chatMembers;
