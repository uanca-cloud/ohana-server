/* eslint-disable camelcase */
const {
        AUDIT_REPORTS_STATUS_ENUM: {REPORT_PENDING, REPORT_COMPLETE}
    } = require('../constants'),
    {
        auditReportsFixtures: {auditReport1, auditReport2, auditReport3}
    } = require('../test/fixtures/AuditReportFixtures'),
    {
        fixtureData: {user2}
    } = require('../test/fixtures/UsersFixtures');

let pool = null,
    auditReportId = null,
    bootstrapTest = null,
    truncateTables = null,
    selectTestAuditReportByUser = null,
    insertTestUser = null,
    format = null;

beforeEach(async () => {
    auditReportId = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    selectTestAuditReportByUser =
        require('../test/fixtures/AuditReportFixtures').selectTestAuditReportByUser;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    format = require('date-fns').format;

    pool = bootstrapTest();

    jest.useFakeTimers().setSystemTime(new Date('2022-01-01').getTime());

    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);
});

afterEach(async () => {
    jest.useRealTimers();

    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for audit reports', () => {
    beforeEach(async () => {
        const {createAuditEventReport} = require('./AuditEventsReportsDao');
        await insertTestUser(pool, user2);
        const auditReport = await createAuditEventReport(null, {
            userId: auditReport1.userId,
            tenantId: auditReport1.tenantId,
            startDate: auditReport1.startDate,
            endDate: auditReport1.endDate
        });
        auditReportId = auditReport.id;
    });

    describe('and we want to update an already existing report', () => {
        it('then the updated report should be returned', async () => {
            const {
                createAuditEventReport,
                updateAuditEventReport
            } = require('./AuditEventsReportsDao');

            await updateAuditEventReport({
                auditReportId: auditReportId,
                tenantId: auditReport1.tenantId,
                status: REPORT_COMPLETE,
                metadata: auditReport1.metadata
            });
            await createAuditEventReport(null, {
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId,
                startDate: auditReport1.startDate,
                endDate: auditReport1.endDate
            });
            const result = await selectTestAuditReportByUser(pool, {
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId
            });

            expect(result.rows[0].metadata).toBe(null);
            expect(result.rows[0].status).toBe(REPORT_PENDING);
        });
    });

    describe('and we want query for generated reports', () => {
        it('then all audit reports should be returned', async () => {
            const {createAuditEventReport} = require('./AuditEventsReportsDao');
            await createAuditEventReport(null, {
                userId: auditReport2.userId,
                tenantId: auditReport2.tenantId,
                startDate: auditReport2.startDate,
                endDate: auditReport2.endDate
            });
            const result = await selectTestAuditReportByUser(pool, {
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId
            });

            expect(result.rowCount).toBe(2);
        });
    });

    describe('and we want update an audit report', () => {
        it('then the updated audit report should be returned', async () => {
            const {updateAuditEventReport} = require('./AuditEventsReportsDao');
            await updateAuditEventReport({
                auditReportId: auditReportId,
                tenantId: auditReport1.tenantId,
                status: REPORT_COMPLETE,
                metadata: auditReport1.metadata
            });
            const result = await selectTestAuditReportByUser(pool, {
                tenantId: auditReport1.tenantId,
                userId: auditReport1.userId
            });

            expect(result.rows[0].id).toBe(auditReportId);
            expect(parseInt(result.rows[0].user_id)).toBe(auditReport1.userId);
            expect(parseInt(result.rows[0].tenant_id)).toBe(auditReport1.tenantId);
            expect(result.rows[0].status).toBe(REPORT_COMPLETE);
            expect(format(result.rows[0].status_date, 'yyyy-MM-dd')).toBe(
                format(new Date(), 'yyyy-MM-dd')
            );
            expect(result.rows[0].name).toBe(auditReport1.name);
            expect(format(result.rows[0].start_date, 'yyyy-MM-dd')).toBe(
                format(result.rows[0].start_date, 'yyyy-MM-dd')
            );
            expect(format(result.rows[0].end_date, 'yyyy-MM-dd')).toBe(
                format(result.rows[0].end_date, 'yyyy-MM-dd')
            );
            expect(result.rows[0].metadata).toStrictEqual(
                expect.arrayContaining(auditReport1.metadata)
            );
        });
    });

    describe('and we want update an audit report using a wrong id', () => {
        it('then no rows should be returned', async () => {
            const {updateAuditEventReport} = require('./AuditEventsReportsDao');
            const result = await updateAuditEventReport({
                auditReportId: 'asdasdasd-23sasda',
                tenantId: auditReport1.tenantId,
                status: REPORT_COMPLETE,
                metadata: auditReport1.metadata
            });

            expect(result).toBe(null);
        });
    });

    describe('and we want select an audit report by id and wrong user id', () => {
        it('then no rows should be returned', async () => {
            const {selectAuditEventReport} = require('./AuditEventsReportsDao');

            const result = await selectAuditEventReport({
                id: auditReportId,
                tenantId: auditReport1.tenantId,
                userId: 1
            });

            expect(result).toBe(null);
        });
    });

    describe('and we want select an audit report by id and wrong tenant id', () => {
        it('then no rows should be returned', async () => {
            const {selectAuditEventReport} = require('./AuditEventsReportsDao');
            const result = await selectAuditEventReport({
                id: auditReportId,
                tenantId: 2,
                userId: auditReport1.userId
            });

            expect(result).toBe(null);
        });
    });

    describe('and we want select an audit report by id', () => {
        it('then that audit report should be returned', async () => {
            const {selectAuditEventReport} = require('./AuditEventsReportsDao');

            const result = await selectAuditEventReport({
                id: auditReportId,
                tenantId: auditReport1.tenantId,
                userId: auditReport1.userId
            });

            expect(result.id).toBe(auditReportId);
            expect(result.name.includes(auditReport1.name)).toBe(true);
            expect(result.status).toBe(REPORT_PENDING);
            expect(result.statusDate).toBe(format(new Date(), 'yyyy-MM-dd'));
            expect(result.startDate).toBe(auditReport1.startDate);
            expect(result.endDate).toBe(auditReport1.endDate);
        });
    });

    describe('and we want to get all audit reports generated by an user', () => {
        it('then that audit report should be returned', async () => {
            const {getAuditReportsByUser} = require('./AuditEventsReportsDao');

            const result = await getAuditReportsByUser({
                tenantId: auditReport1.tenantId,
                userId: auditReport1.userId
            });

            expect(result.length).toBe(1);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        endDate: auditReport1.endDate,
                        id: auditReportId,
                        startDate: auditReport1.startDate,
                        status: REPORT_PENDING,
                        statusDate: format(new Date(), 'yyyy-MM-dd')
                    })
                ])
            );
        });
    });

    describe('and we want to replace an audit report', () => {
        it('then the new audit report should be returned', async () => {
            const {updateAuditEventReport, replaceAuditReport} = require('./AuditEventsReportsDao');
            await updateAuditEventReport({
                auditReportId: auditReportId,
                tenantId: auditReport1.tenantId,
                status: REPORT_COMPLETE,
                metadata: auditReport1.metadata
            });

            const result = await replaceAuditReport({
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId,
                startDate: auditReport2.startDate,
                endDate: auditReport2.endDate
            });

            expect(result.id).not.toBe(auditReportId);
            expect(result.name.includes(auditReport2.name)).toBe(true);
            expect(result.status).toBe(REPORT_PENDING);
            expect(result.statusDate).toBe(format(new Date(), 'yyyy-MM-dd'));
            expect(result.startDate).toBe(auditReport2.startDate);
            expect(result.endDate).toBe(auditReport2.endDate);
        });
    });

    describe('and we want to replace an audit report', () => {
        it('then only one audit report should be returned', async () => {
            const {replaceAuditReport} = require('./AuditEventsReportsDao');
            await replaceAuditReport({
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId,
                startDate: auditReport2.startDate,
                endDate: auditReport2.endDate
            });
            const result = await selectTestAuditReportByUser(pool, {
                userId: auditReport1.userId,
                tenantId: auditReport1.tenantId
            });
            expect(result.rowCount).toBe(1);
        });
    });

    describe('and we want to query for all audit report assets', () => {
        it('then all audit report assets should be returned', async () => {
            const {
                updateAuditEventReport,
                getAuditReportsAssets
            } = require('./AuditEventsReportsDao');
            await updateAuditEventReport({
                auditReportId: auditReportId,
                tenantId: auditReport1.tenantId,
                status: REPORT_COMPLETE,
                metadata: auditReport1.metadata
            });
            const result = await getAuditReportsAssets();
            expect(result[0]).toBe(auditReport1.metadata[0].filePath);
        });
    });

    describe('and we want to generate a report with media', () => {
        it('then the updated report name should contain "_media_"', async () => {
            const {createAuditEventReport} = require('./AuditEventsReportsDao');

            await createAuditEventReport(null, {
                userId: auditReport3.userId,
                tenantId: auditReport3.tenantId,
                startDate: auditReport3.startDate,
                endDate: auditReport3.endDate,
                includeMedia: true
            });
            const result = await selectTestAuditReportByUser(pool, {
                userId: auditReport3.userId,
                tenantId: auditReport3.tenantId
            });

            expect(result.rows[0].name).toMatch(/_media/);
        });
    });

    describe('and we want to generate a report without media', () => {
        it('then the updated report name should not contain "_media_"', async () => {
            const {createAuditEventReport} = require('./AuditEventsReportsDao');

            await createAuditEventReport(null, {
                userId: auditReport3.userId,
                tenantId: auditReport3.tenantId,
                startDate: auditReport3.startDate,
                endDate: auditReport3.endDate,
                includeMedia: false
            });
            const result = await selectTestAuditReportByUser(pool, {
                userId: auditReport3.userId,
                tenantId: auditReport3.tenantId
            });

            expect(result.rows[0].name).not.toMatch(/_media/);
        });
    });
});
