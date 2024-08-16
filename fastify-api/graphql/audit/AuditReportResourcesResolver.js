const {getAuditReportResourcesByUser} = require('ohana-shared');

async function AuditReportResourcesResolver(_parent, args, {userId, tenantId}) {
    const {id} = args;
    return getAuditReportResourcesByUser({userId, tenantId, id});
}

module.exports = AuditReportResourcesResolver;
