const Joi = require('joi');

const cancelAuditReport = Joi.object().keys({id: Joi.string().required()}).required();

module.exports = cancelAuditReport;
