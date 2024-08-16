const {
    getLogger,
    CONSTANTS: {SERVICE_BUS_AUDIT_QUEUE_NAME, AUDIT_MAX_REPORTS_PER_USER},
    pushMessageInQueue,
    bootstrapAzureServiceBusClient,
    createAuditEventReport,
    getAuditReportsByUser,
    replaceAuditReport
} = require('ohana-shared');

async function CreateAuditReportResolver(_parent, args, context) {
    const logger = getLogger('CreateAuditReportResolver', context);
    const {userId, tenantId, version} = context;
    const {startDate, endDate} = args.input;
    const includeMedia = args.input.includeMedia;

    let auditReport;
    const result = await getAuditReportsByUser({userId, tenantId});
    if (result && result.length === AUDIT_MAX_REPORTS_PER_USER) {
        auditReport = await replaceAuditReport({
            startDate,
            endDate,
            userId,
            tenantId,
            includeMedia
        });
    } else {
        auditReport = await createAuditEventReport(null, {
            startDate,
            endDate,
            userId,
            tenantId,
            includeMedia
        });
    }

    const serviceBusClient = bootstrapAzureServiceBusClient();
    const message = `{"auditReportId": "${auditReport.id}", "tenantId": "${tenantId}","userId": "${userId}", "version": "${version}", "includeMedia": ${includeMedia}}`;

    try {
        await pushMessageInQueue(serviceBusClient, SERVICE_BUS_AUDIT_QUEUE_NAME, message);
    } catch (error) {
        logger.error({error}, 'Error while pushing message in service bus queue.');
        throw new Error('Error while pushing message in service bus queue.');
    }

    return auditReport;
}

module.exports = CreateAuditReportResolver;
