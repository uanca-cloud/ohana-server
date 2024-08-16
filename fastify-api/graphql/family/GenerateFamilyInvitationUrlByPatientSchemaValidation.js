const Joi = require('joi');

const generateFamilyInvitationUrlByPatient = Joi.object()
    .keys({patientId: Joi.number().required()})
    .required();

module.exports = generateFamilyInvitationUrlByPatient;
