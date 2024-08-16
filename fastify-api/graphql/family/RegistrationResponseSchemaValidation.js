const Joi = require('joi');

const registrationResponse = Joi.object()
    .keys({
        invitationToken: Joi.string().required(),
        challengeStringSigned: Joi.string().required(),
        publicKey: Joi.string().required()
    })
    .required();

module.exports = registrationResponse;
