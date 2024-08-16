const Joi = require('joi');

const authenticationChallenge = Joi.object().keys({userId: Joi.string().required()}).required();

module.exports = authenticationChallenge;
