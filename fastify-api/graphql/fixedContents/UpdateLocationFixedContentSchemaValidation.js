const Joi = require('joi');

const updateLocationFixedContent = Joi.object()
    .keys({
        fixedContentId: Joi.number().required(),
        fixedContent: Joi.object()
            .required()
            .keys({
                title: Joi.string().max(25).required(),
                url: Joi.string().uri().required(),
                color: Joi.string().required()
            })
    })
    .required();

module.exports = updateLocationFixedContent;
