const Joi = require('joi');

const deleteLocationQuickMessage = Joi.object()
    .keys({
        messageId: Joi.number().required()
    })
    .required();

module.exports = deleteLocationQuickMessage;
