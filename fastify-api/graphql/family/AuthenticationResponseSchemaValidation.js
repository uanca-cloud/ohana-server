const Joi = require('joi');

const authenticationResponse = Joi.object()
    .keys({
        challengeStringSigned: Joi.string().required(),
        userId: Joi.string().required(),
        device: Joi.object({
            deviceId: Joi.string().required(),
            osVersion: Joi.string().required(),
            deviceModel: Joi.string().required(),
            appVersion: Joi.string().required(),
            deviceName: Joi.string()
        }).required()
    })
    .required();

module.exports = authenticationResponse;
