const Joi = require('joi');

const disassociatePatient = Joi.object().keys({patientId: Joi.number().required()}).required();

module.exports = disassociatePatient;
