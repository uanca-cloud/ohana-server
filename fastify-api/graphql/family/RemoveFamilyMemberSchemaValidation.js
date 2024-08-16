const Joi = require('joi');

const removeFamilyMember = Joi.object().keys({userId: Joi.string().required()}).required();

module.exports = removeFamilyMember;
