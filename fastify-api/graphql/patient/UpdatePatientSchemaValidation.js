const Joi = require('joi');

const patient = Joi.object()
    .keys({
        id: Joi.number().required(),
        firstName: Joi.string().trim().max(50).required(),
        lastName: Joi.string().trim().max(50).required(),
        dateOfBirth: Joi.date().max('now').iso().required(),
        location: Joi.number().allow(null).required(),
        allowSecondaryFamilyMembers: Joi.boolean(),
        externalId: Joi.string()
    })
    .required();
const updatePatient = Joi.object().keys({patient}).required();

module.exports = updatePatient;
