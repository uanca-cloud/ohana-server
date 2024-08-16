const Joi = require('joi');

const removeLocationFixedContent = Joi.object()
    .keys({
        fixedContentId: Joi.number().required()
    })
    .required();

module.exports = removeLocationFixedContent;
