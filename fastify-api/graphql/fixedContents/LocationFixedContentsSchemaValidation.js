const Joi = require('joi');

const locationFixedContents = Joi.object().keys({locationId: Joi.number()}).required();

module.exports = locationFixedContents;
