const {
    getLogger,
    CONSTANTS: {
        AUDIT_REPORTS_STATUS_ENUM: {REPORT_CANCELLED}
    },
    NotFoundError,
    updateAuditEventReport
} = require('ohana-shared');

async function CancelAuditReportResolver(_parent, args, context) {
    const logger = getLogger('CancelAuditReportResolver', context);
    const {tenantId} = context;
    const {id} = args;

    const result = await updateAuditEventReport({
        auditReportId: id,
        tenantId,
        status: REPORT_CANCELLED,
        metadata: null
    });

    if (!result) {
        logger.error('Audit report id not found');
        throw new NotFoundError({description: 'Audit report id not found'});
    }

    return result;
}

module.exports = CancelAuditReportResolver;
