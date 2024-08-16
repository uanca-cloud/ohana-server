const Joi = require('joi');

const adminCreateOrRefreshSession = Joi.object()
    .keys({bearerToken: Joi.string().required(), tenantId: Joi.string().required()})
    .required();

module.exports = adminCreateOrRefreshSession;
