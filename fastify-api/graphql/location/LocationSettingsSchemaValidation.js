const Joi = require('joi');

const locationSettings = Joi.object().keys({locationId: Joi.number().required()}).required();

module.exports = locationSettings;
