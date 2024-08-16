const Joi = require('joi');

const createUpdate = Joi.object().keys({encounterId: Joi.string().required()}).required();

module.exports = createUpdate;
