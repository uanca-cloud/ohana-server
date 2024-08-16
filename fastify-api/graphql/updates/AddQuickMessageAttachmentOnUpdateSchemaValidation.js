const Joi = require('joi');

const input = Joi.object()
    .keys({
        encounterId: Joi.string().required(),
        updateId: Joi.string().required(),
        quickMessageId: Joi.string().required()
    })
    .required();

const addQuickMessageAttachmentOnUpdate = Joi.object().keys({input}).required();

module.exports = addQuickMessageAttachmentOnUpdate;
