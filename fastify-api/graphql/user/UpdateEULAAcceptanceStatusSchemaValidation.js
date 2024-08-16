const Joi = require('joi');

const eulaValidation = Joi.object().keys({acceptedEula: Joi.boolean().required()}).required();

module.exports = eulaValidation;
