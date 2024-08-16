const Joi = require('joi');

const locationQuickMessages = Joi.object()
    .keys({
        locationId: Joi.number()
    })
    .required();

module.exports = locationQuickMessages;
