const Joi = require('joi');

const removeLocation = Joi.object().keys({id: Joi.number().required()}).required();

module.exports = removeLocation;
