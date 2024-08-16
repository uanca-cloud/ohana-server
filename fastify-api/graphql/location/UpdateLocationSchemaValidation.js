const Joi = require('joi');

const location = Joi.object()
    .keys({id: Joi.number().required(), label: Joi.string().trim().max(100).required()})
    .required();
const updateLocation = Joi.object().keys({location}).required();

module.exports = updateLocation;
