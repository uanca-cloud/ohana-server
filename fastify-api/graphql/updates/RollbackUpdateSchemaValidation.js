const Joi = require('joi');

const rollbackUpdate = Joi.object()
    .keys({encounterId: Joi.string().required(), updateId: Joi.string().required()})
    .required();

module.exports = rollbackUpdate;
