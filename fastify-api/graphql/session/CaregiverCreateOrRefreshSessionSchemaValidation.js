const Joi = require('joi');

const caregiverCreateOrRefreshSession = Joi.object()
    .keys({
        bearerToken: Joi.string().required(),
        tenantId: Joi.string().alphanum().max(6).required(),
        device: Joi.object({
            deviceId: Joi.string().required(),
            osVersion: Joi.string().required(),
            deviceModel: Joi.string().required(),
            appVersion: Joi.string().required(),
            deviceName: Joi.string()
        }).required()
    })
    .required();

module.exports = caregiverCreateOrRefreshSession;
