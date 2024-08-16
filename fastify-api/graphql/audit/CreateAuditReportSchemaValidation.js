const Joi = require('joi'),
    {differenceInCalendarDays} = require('date-fns'),
    {
        CONSTANTS: {AUDIT_MAX_DATE_DIFFERENCE_IN_DAYS, AUDIT_MIN_START_DATE}
    } = require('ohana-shared');

const input = Joi.object()
    .keys({
        startDate: Joi.date().iso().max(Joi.ref('endDate')).min(AUDIT_MIN_START_DATE).required(),
        endDate: Joi.date().iso().max('now').required(),
        includeMedia: Joi.boolean()
    })
    .custom((obj) => {
        const {startDate, endDate} = obj;
        const isValid =
            Math.abs(differenceInCalendarDays(startDate, endDate)) <=
            AUDIT_MAX_DATE_DIFFERENCE_IN_DAYS;

        if (!isValid) {
            throw new Error('Difference between dates cannot be greater than 90 days');
        }

        return obj;
    })
    .required();

const createAuditReport = Joi.object().keys({input}).required();

module.exports = createAuditReport;
