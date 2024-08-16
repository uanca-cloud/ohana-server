const Joi = require('joi');

const updateLocationQuickMessagesOrder = Joi.object()
    .keys({
        locationId: Joi.number(),
        quickMessagesOrder: Joi.array().items(Joi.number()).required()
    })
    .required();

module.exports = updateLocationQuickMessagesOrder;
