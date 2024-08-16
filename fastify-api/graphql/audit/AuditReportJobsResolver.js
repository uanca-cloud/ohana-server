const {getAuditReportsByUser} = require('ohana-shared');

async function AuditReportJobsResolver(_parent, _args, {userId, tenantId}) {
    return getAuditReportsByUser({userId, tenantId});
}

module.exports = AuditReportJobsResolver;
