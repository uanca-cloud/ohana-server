const Joi = require('joi');

const patient = Joi.object()
    .keys({
        externalId: Joi.string().required(),
        firstName: Joi.string().trim().max(50).required(),
        lastName: Joi.string().trim().max(50).required(),
        dateOfBirth: Joi.date().iso().required(),
        location: Joi.number().required(),
        allowSecondaryFamilyMembers: Joi.boolean()
    })
    .required();
const enrollPatient = Joi.object().keys({patient}).required();

module.exports = enrollPatient;
