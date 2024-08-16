const Joi = require('joi');

const quickMessagesByPatient = Joi.object().keys({patientId: Joi.number().required()}).required();

module.exports = quickMessagesByPatient;
