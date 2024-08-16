const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        AUDIT_REPORTS_STATUS_ENUM: {REPORT_PENDING, REPORT_COMPLETE},
        DB_CONNECTION_POOLS,
        FAMILY_APP_NAME,
        AZURE_AUDIT_CONTAINER_NAME
    } = require('../constants'),
    {v4: uuid} = require('uuid'),
    {format} = require('date-fns'),
    {dateToUTC} = require('../DateFormattingHelper'),
    {runWithTransaction} = require('../DaoHelper'),
    {getBlobTempPublicUrl} = require('../AzureStorageAccountGateway'),
    {createAuditReportResultTemplate} = require('../EntitiesFactory'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('AuditEventsReportDao');

async function createAuditEventReport(pool, auditInfo) {
    logger.debug('Creating audit event report...');
    const {userId, tenantId, startDate, endDate, includeMedia} = auditInfo;
    const id = uuid();
    const initiateAuditReportQuery = `
        INSERT INTO audit_events_reports(
            id,
            user_id,
            tenant_id,
            status,
            status_date,
            name,
            start_date,
            end_date,
            generated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT(user_id, tenant_id, name)
        DO UPDATE SET
            id = $1,
            status = $4,
            status_date = $5,
            metadata = NULL;`;

    const client = pool || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const appName = FAMILY_APP_NAME.replace(/ /g, '_').toLowerCase();
    const currentDateTime = new Date();
    const auditBaseName = includeMedia ? 'audit_log_media' : 'audit_log';
    const reportName = `${appName}_${auditBaseName}_${format(
        new Date(startDate),
        'yyyy.MM.dd'
    )}_${format(new Date(endDate), 'yyyy.MM.dd')}_${currentDateTime.toISOString()}`;

    await client.query(initiateAuditReportQuery, [
        id,
        userId,
        tenantId,
        REPORT_PENDING,
        dateToUTC(currentDateTime),
        reportName,
        new Date(`${startDate}T00:00:00Z`),
        new Date(`${endDate}T00:00:00Z`),
        currentDateTime
    ]);

    return createAuditReportResultTemplate({
        id,
        name: `${reportName}`,
        status: REPORT_PENDING,
        statusDate: format(currentDateTime, 'yyyy-MM-dd'),
        startDate,
        endDate,
        generatedDate: format(currentDateTime, 'yyyy-MM-dd')
    });
}

async function selectAuditEventReport(auditEvent) {
    logger.debug('Getting audit event report...');
    const {id, tenantId, userId} = auditEvent;
    const selectAuditEventReportQuery = `
        SELECT
            id,
            user_id,
            tenant_id,
            status,
            status_date,
            name,
            start_date,
            end_date,
            metadata,
            generated_at
        FROM audit_events_reports
        WHERE
            id = $1
            AND tenant_id = $2
            AND user_id = $3;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(selectAuditEventReportQuery, [id, tenantId, userId]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, userId}}, 'No audit event report found.');
        return null;
    }

    return createAuditReportResultTemplate({
        id,
        name: `${result.rows[0].name}`,
        status: result.rows[0].status,
        statusDate: format(result.rows[0].status_date, 'yyyy-MM-dd'),
        startDate: format(result.rows[0].start_date, 'yyyy-MM-dd'),
        endDate: format(result.rows[0].end_date, 'yyyy-MM-dd'),
        generatedDate: result.rows[0].generated_at.toISOString()
    });
}

async function getAuditReportsByUser(auditEvent) {
    logger.debug('Getting audit event report by user id...');
    const {tenantId, userId} = auditEvent;
    const selectAuditEventReportQuery = `
         SELECT
            id,
            user_id,
            tenant_id,
            status,
            status_date,
            name,
            start_date,
            end_date,
            metadata,
            generated_at
         FROM audit_events_reports
         WHERE
             tenant_id = $1
             AND user_id = $2
         ORDER BY generated_at DESC;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(selectAuditEventReportQuery, [tenantId, userId]);

    if (!results.rowCount) {
        logger.info({metadata: {tenantId, userId}}, 'No audit event report found.');
        return [];
    }

    return results.rows.map((result) =>
        createAuditReportResultTemplate({
            id: result.id,
            name: result.name,
            status: result.status,
            statusDate: format(result.status_date, 'yyyy-MM-dd'),
            startDate: format(result.start_date, 'yyyy-MM-dd'),
            endDate: format(result.end_date, 'yyyy-MM-dd'),
            generatedDate: result.generated_at.toISOString()
        })
    );
}

async function getAuditReportResourcesByUser(auditEvent) {
    logger.debug('Getting audit event report resources by user id...');
    const {tenantId, userId, id} = auditEvent;
    const selectAuditEventReportQuery = `
        SELECT metadata FROM audit_events_reports
        WHERE
            tenant_id = $1
            AND user_id = $2
            AND id = $3
            AND status = $4;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(selectAuditEventReportQuery, [
        tenantId,
        userId,
        id,
        REPORT_COMPLETE
    ]);

    if (!results.rowCount) {
        logger.info({metadata: {tenantId, userId}}, 'No audit event report exists...');
        return [];
    }

    return results.rows[0].metadata.map(async (entry) => {
        const token = await getBlobTempPublicUrl(AZURE_AUDIT_CONTAINER_NAME, `${entry.filePath}`);
        return `${entry.url}?${token}`;
    });
}

async function updateAuditEventReport(auditEvent) {
    logger.debug('Updating audit event report...');
    const {auditReportId, tenantId, status, metadata} = auditEvent;
    const selectAuditEventReportQuery = `
        UPDATE
            audit_events_reports SET status = $1,
            metadata = $2,
            status_date = $3
        WHERE
            id = $4
            AND tenant_id = $5
        RETURNING
            name,
            status_date,
            start_date,
            end_date,
            status,
            generated_at;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const statusDate = dateToUTC(new Date());
    const result = await client.query(selectAuditEventReportQuery, [
        status,
        metadata,
        statusDate,
        auditReportId,
        tenantId
    ]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId}}, 'No audit event report found.');
        return null;
    }

    return createAuditReportResultTemplate({
        id: auditReportId,
        name: result.rows[0].name,
        status: result.rows[0].status,
        statusDate: format(result.rows[0].status_date, 'yyyy-MM-dd'),
        startDate: format(result.rows[0].start_date, 'yyyy-MM-dd'),
        endDate: format(result.rows[0].end_date, 'yyyy-MM-dd'),
        generatedDate: result.rows[0].generated_at.toISOString()
    });
}

async function replaceAuditReport(auditEvent) {
    logger.debug('Replacing audit event report...');
    const {startDate, endDate, userId, tenantId, includeMedia} = auditEvent;
    const deleteAuditEventReportQuery = `
        DELETE FROM audit_events_reports
          WHERE id IN
          ( SELECT audit_events_reports.id FROM audit_events_reports
            WHERE user_id = $1 AND tenant_id = $2 ORDER BY generated_at ASC LIMIT 1
          );
    `;

    let result = null;
    await runWithTransaction(async (dbClient) => {
        await dbClient.query(deleteAuditEventReportQuery, [userId, tenantId]);
        result = await createAuditEventReport(dbClient, {
            startDate,
            endDate,
            userId,
            tenantId,
            includeMedia
        });
    });

    return result;
}

async function getAuditReportsAssets() {
    logger.debug('Getting audit event report assets...');
    const getAuditReportsAssetsQuery = `SELECT metadata from audit_events_reports WHERE status = $1`;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(getAuditReportsAssetsQuery, [REPORT_COMPLETE]);

    if (!result.rowCount) {
        logger.info('No audit events assets found.');
        return [];
    }
    let assets = [];
    result.rows.forEach((res) => {
        res.metadata.forEach((entry) => assets.push(entry.filePath));
    });

    return assets;
}

module.exports = {
    createAuditEventReport,
    selectAuditEventReport,
    updateAuditEventReport,
    getAuditReportsByUser,
    getAuditReportResourcesByUser,
    replaceAuditReport,
    getAuditReportsAssets
};
