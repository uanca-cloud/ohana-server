const Joi = require('joi');

const input = Joi.object()
    .keys({
        encounterId: Joi.string().required(),
        updateId: Joi.string().required(),
        text: Joi.string().max(1024),
        type: Joi.string().max(1024)
    })
    .required();
const commitUpdate = Joi.object().keys({input}).required();

module.exports = commitUpdate;
