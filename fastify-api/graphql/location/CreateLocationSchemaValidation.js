const Joi = require('joi');

const location = Joi.object()
    .keys({label: Joi.string().trim().max(100).required()})
    .required();
const createLocation = Joi.object().keys({location}).required();

module.exports = createLocation;
