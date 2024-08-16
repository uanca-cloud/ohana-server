const Joi = require('joi');

const config = Joi.object()
    .keys({
        deviceId: Joi.string().required(),
        deviceToken: Joi.string().required(),
        deviceName: Joi.string(),
        partialKey: Joi.string().required(),
        notificationPlatform: Joi.string().valid('apns', 'gcm').required()
    })
    .required();
const updatePushNotificationsConfig = Joi.object().keys({config}).required();

module.exports = updatePushNotificationsConfig;
