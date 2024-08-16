const Joi = require('joi');

const familyMember = Joi.object()
    .keys({
        userId: Joi.string().required(),
        phoneNumber: Joi.string().replace(/[^\d]/g, '').max(15).required(),
        preferredLocale: Joi.string().required(),
        patientRelationship: Joi.string().required(),
        firstName: Joi.string().max(50).required(),
        lastName: Joi.string().max(50).required()
    })
    .required();

const updateFamilyMember = Joi.object().keys({familyMember}).required();

module.exports = updateFamilyMember;
