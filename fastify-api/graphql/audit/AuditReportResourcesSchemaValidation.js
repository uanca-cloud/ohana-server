const Joi = require('joi');

const auditReportResources = Joi.object().keys({id: Joi.string().required()}).required();

module.exports = auditReportResources;
