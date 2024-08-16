const Joi = require('joi');

const markUpdateAsRead = Joi.object()
    .keys({updateIds: Joi.array().min(1).items(Joi.string()).required()})
    .required();

module.exports = markUpdateAsRead;
