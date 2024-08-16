const Joi = require('joi');

const registrationChallenge = Joi.object()
    .keys({invitationToken: Joi.string().required()})
    .required();

module.exports = registrationChallenge;
