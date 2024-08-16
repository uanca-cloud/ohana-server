const Joi = require('joi');

const generateFamilyInvitationSmsByPatient = Joi.object()
    .keys({patientId: Joi.number().required(), phoneNumber: Joi.string().required()})
    .required();

module.exports = generateFamilyInvitationSmsByPatient;
