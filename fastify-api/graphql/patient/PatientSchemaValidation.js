const Joi = require('joi');

const patient = Joi.object()
    .keys({
        patientId: Joi.number().optional().allow(null),
        externalId: Joi.string().optional().allow(null)
    })
    .or('patientId', 'externalId');

module.exports = patient;
