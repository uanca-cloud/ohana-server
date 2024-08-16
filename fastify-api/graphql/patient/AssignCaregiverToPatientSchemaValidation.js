const Joi = require('joi');

const assignCaregiverToPatientResolver = Joi.object()
    .keys({patientId: Joi.number().required(), encounterId: Joi.number().required()})
    .required();

module.exports = assignCaregiverToPatientResolver;
