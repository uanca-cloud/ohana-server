const Joi = require('joi');

const createLocationFixedContent = Joi.object()
    .keys({
        locationId: Joi.number(),
        fixedContent: Joi.object()
            .required()
            .keys({
                title: Joi.string().max(25).required(),
                url: Joi.string().uri().required(),
                color: Joi.string().required()
            })
    })
    .required();

module.exports = createLocationFixedContent;
