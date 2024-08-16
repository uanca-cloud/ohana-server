const {format} = require('date-fns');

function dateFromIsoTimestamp(date) {
    return date.toISOString().substr(0, 10);
}

function dateToUTC(date) {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return new Date(`${formattedDate}T00:00:00Z`);
}

module.exports = {
    dateFromIsoTimestamp,
    dateToUTC
};
