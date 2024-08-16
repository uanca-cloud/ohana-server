const Joi = require('joi');

const findPatientInformation = Joi.object()
    .keys({
        bearerToken: Joi.string().required(),
        externalId: Joi.string().required(),
        externalIdType: Joi.string().required()
    })
    .required();

module.exports = findPatientInformation;
