const auditReportsFixtures = {
    auditReport1: {
        userId: 321,
        tenantId: 1,
        startDate: '2021-01-23',
        endDate: '2021-09-28',
        name: 'voalte_family_audit_log_2021.01.23_2021.09.28_2022-01-01T00:00:00.000Z',
        metadata: [
            {
                url: 'https://sadevohanadev.blob.core.windows.net/audit/1/321/voalte_family_audit_log_2021.01.23_2021.09.28',
                filePath: '1/321/voalte_family_audit_log_2021.01.23_2021.09.28',
                filename: 'voalte_family_audit_log_2021.01.23_2021.09.28'
            }
        ]
    },
    auditReport2: {
        userId: 321,
        tenantId: 1,
        startDate: '2021-05-28',
        endDate: '2021-09-30',
        name: 'voalte_family_audit_log_2021.05.28_2021.09.30',
        metadata: [
            {
                url: 'https://sadevohanadev.blob.core.windows.net/audit/1/321/voalte_family_audit_log_2021.05.28_2021.09.30.zip',
                filePath: '1/321/voalte_family_audit_log_2021.05.28_2021.09.30.zip',
                filename: 'voalte_family_audit_log_2021.05.28_2021.09.30.zip'
            }
        ]
    },
    auditReport3: {
        userId: 321,
        tenantId: 2,
        startDate: '2021-05-28',
        endDate: '2021-09-30'
    }
};

async function selectTestAuditReportByUser(database, {tenantId, userId}) {
    return database.query(
        `
        SELECT id, user_id, tenant_id, status, status_date, name, start_date, end_date, metadata
         FROM audit_events_reports WHERE tenant_id = $1 and user_id = $2; 
    `,
        [tenantId, userId]
    );
}

async function updateTestAuditReport(database, {status, id, tenantId, metadata}) {
    return database.query(
        `
      UPDATE audit_events_reports SET status = $1, metadata = $2 WHERE id = $3 AND tenant_id = $4;
    `,
        [status, metadata, id, tenantId]
    );
}

module.exports = {auditReportsFixtures, selectTestAuditReportByUser, updateTestAuditReport};
