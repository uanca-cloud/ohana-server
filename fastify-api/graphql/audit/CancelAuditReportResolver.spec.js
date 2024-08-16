let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateAuditEventReport: jest.fn(() => ({
            name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
            status: 'cancelled',
            id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30',
            statusDate: '2021-10-01',
            startDate: '2021-01-23',
            endDate: '2021-09-28'
        })),
        writeLog: jest.fn(() => {})
    }));

    resolver = require('./CancelAuditReportResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./CancelAuditReportResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to cancel an audit report generation', () => {
    describe('when input is provided', () => {
        test('then it should return the updated audit report', async () => {
            const result = await resolver(
                null,
                {id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30'},
                {tenantId: 1, userId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
                    status: 'cancelled',
                    id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30',
                    statusDate: '2021-10-01',
                    startDate: '2021-01-23',
                    endDate: '2021-09-28'
                })
            );
        });
    });

    describe('when no audit report is found', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.updateAuditEventReport.mockImplementationOnce(() => null);

            try {
                await resolver(
                    null,
                    {id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30'},
                    {tenantId: 1, userId: 1}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Audit report id not found');
                expect(err.message).toBe('Not Found Error');
                expect(err.extensions.code).toBe('NOT_FOUND');
            }
        });
    });
});
