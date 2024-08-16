const Joi = require('joi');

const input = Joi.object()
    .keys({
        encounterId: Joi.string().required(),
        updateId: Joi.string().required(),
        filename: Joi.string().required()
    })
    .required();

const removeMediaAttachmentOnUpdate = Joi.object().keys({input}).required();

module.exports = removeMediaAttachmentOnUpdate;
