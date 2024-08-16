const Joi = require('joi');

const input = Joi.object()
    .keys({
        encounterId: Joi.string().required(),
        updateId: Joi.string().required(),
        id: Joi.string().required()
    })
    .required();

const removeAttachmentOnUpdate = Joi.object().keys({input}).required();

module.exports = removeAttachmentOnUpdate;
