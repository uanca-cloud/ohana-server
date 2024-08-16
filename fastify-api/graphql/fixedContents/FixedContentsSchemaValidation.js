const Joi = require('joi');

const fixedContents = Joi.object()
    .keys({locationId: Joi.number().optional().allow(null)})
    .required();

module.exports = fixedContents;
