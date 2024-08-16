const {
        CONSTANTS: {
            AUDIT_REPORTS_STATUS_ENUM: {
                REPORT_COMPLETE,
                REPORT_CANCELLED,
                REPORT_FAILED,
                REPORT_PENDING
            },
            AUDIT_POOL_REPORT_STATUS_INTERVAL_IN_MILLISECONDS,
            LAST_SUPPORTED_VERSION
        },
        selectAuditEventReport,
        updateAuditEventReport,
        getLogger,
        selectAuditReportData,
        bootstrapAzf,
        uploadZIPFile,
        getPhotoAttachmentsForAudit,
        generateAuditCSV,
        uploadMediaAttachments
    } = require('ohana-shared'),
    AdmZip = require('adm-zip'),
    {AbortController} = require('@azure/abort-controller'),
    fs = require('fs'),
    semver = require('semver');

let bootstrapped = false;

async function AuditFunction(_context, myQueueItem) {
    const logger = getLogger('AuditFunction', myQueueItem);

    logger.debug('ENTER:Audit');

    if (!bootstrapped) {
        await bootstrapAzf();
    }

    const {auditReportId, tenantId, userId, version, includeMedia} = JSON.parse(myQueueItem);

    if (semver.lt(version, LAST_SUPPORTED_VERSION)) {
        logger.error('Version not supported');
        return false;
    }

    const auditEventReport = await selectAuditEventReport({id: auditReportId, tenantId, userId});

    if (!auditEventReport) {
        logger.error('No audit report found');
        return false;
    }

    const {startDate, endDate, status} = auditEventReport;
    if (status === REPORT_CANCELLED) {
        logger.info('Audit report generation was cancelled');
        logger.debug('EXIT:Audit');

        return true;
    }

    const controller = new AbortController();
    const abortSignal = controller.signal;

    const reportStatusChangeInterval = setInterval(() => {
        (async () => {
            const auditReport = await selectAuditEventReport({id: auditReportId, tenantId, userId});
            if (auditReport && auditReport.status === REPORT_CANCELLED) {
                controller.abort();
            }
        })();
    }, AUDIT_POOL_REPORT_STATUS_INTERVAL_IN_MILLISECONDS);

    const {templates: auditReportData, updateIds} = await selectAuditReportData({
        tenantId,
        startDate,
        endDate
    });

    const reportFolderName = `${auditEventReport.name}`.replace(/:/g, '_');
    const csvPath = `/tmp/${reportFolderName}.csv`;

    const photoAttachments = await getPhotoAttachmentsForAudit(updateIds);

    try {
        await generateAuditCSV(csvPath, photoAttachments, auditReportData);
    } catch (error) {
        logger.error({error}, 'Error creating CSV file');
        await updateAuditEventReport({
            auditReportId,
            tenantId,
            status: REPORT_FAILED,
            metadata: null
        });

        clearInterval(reportStatusChangeInterval);
        fs.unlinkSync(csvPath);

        logger.debug('EXIT:Audit');

        return false;
    }

    let zip = new AdmZip();
    let metadata;
    zip.addLocalFile(csvPath, '');
    if (includeMedia) {
        metadata = await uploadMediaAttachments(
            myQueueItem,
            zip,
            photoAttachments,
            reportFolderName,
            abortSignal
        );
    } else {
        metadata = [await uploadZIPFile(myQueueItem, zip, reportFolderName, 1, abortSignal)];
    }

    clearInterval(reportStatusChangeInterval);
    fs.unlinkSync(csvPath);

    const newAuditEventReport = await selectAuditEventReport({id: auditReportId, tenantId, userId});
    if (newAuditEventReport && newAuditEventReport.status === REPORT_PENDING) {
        // a report should be completed only if it was pending before
        await updateAuditEventReport({
            auditReportId,
            tenantId,
            status: REPORT_COMPLETE,
            metadata
        });
    }
    logger.debug('EXIT:Audit');

    return true;
}

module.exports = AuditFunction;
