const Joi = require('joi');

const familyMember = Joi.object()
    .keys({
        phoneNumber: Joi.string().replace(/[^\d]/g, '').max(15).required(),
        preferredLocale: Joi.string().required(),
        patientDateOfBirth: Joi.date().iso().required(),
        patientRelationship: Joi.string().required(),
        firstName: Joi.string().max(50).required(),
        lastName: Joi.string().max(50).required()
    })
    .required();

const finalizeFamilyMemberRegistration = Joi.object().keys({familyMember}).required();

module.exports = finalizeFamilyMemberRegistration;
