let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapAzureServiceBusClient: jest.fn(() => {}),
        pushMessageInQueue: jest.fn(() => true),
        createAuditEventReport: jest.fn(() => ({
            name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
            status: 'pending',
            id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30',
            statusDate: '2021-10-01',
            startDate: '2021-01-23',
            endDate: '2021-09-28'
        })),
        replaceAuditReport: jest.fn(() => ({
            name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
            status: 'pending',
            id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30',
            statusDate: '2021-10-01',
            startDate: '2021-01-23',
            endDate: '2021-09-28'
        })),
        getAuditReportsByUser: jest.fn(() => []),
        writeLog: jest.fn(() => {})
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CreateAuditReportResolver');
});

afterEach(() => {
    jest.unmock('./CreateAuditReportResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation to create a new audit report', () => {
    describe('when input is provided', () => {
        test('then it should return the new audit report', async () => {
            const result = await resolver(
                null,
                {input: {startDate: '2021-01-23', endDate: '2021-09-28', includeMedia: false}},
                {
                    tenantId: 1,
                    userId: 1,
                    version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
                    status: 'pending',
                    id: '378ef639-ca4e-4e13-b6ed-5b2172d65b30',
                    statusDate: '2021-10-01',
                    startDate: '2021-01-23',
                    endDate: '2021-09-28'
                })
            );

            expect(ohanaSharedPackage.pushMessageInQueue).toHaveBeenCalledWith(
                undefined,
                'MISSING',
                `{"auditReportId": "378ef639-ca4e-4e13-b6ed-5b2172d65b30", "tenantId": "1","userId": "1", "version": "${ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION}", "includeMedia": false}`
            );
        });
    });

    describe('when pushing job into the service bus queue fails', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.pushMessageInQueue.mockRejectedValueOnce('Error');

            try {
                await resolver(
                    null,
                    {input: {startDate: '2021-01-23', endDate: '2021-09-28'}},
                    {
                        tenantId: 1,
                        userId: 1,
                        version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION
                    }
                );
            } catch (err) {
                expect(err.message).toBe('Error while pushing message in service bus queue.');
            }
        });
    });

    describe('when user already has reached the maximum number of allowed reports', () => {
        test('then it should call the replace method', async () => {
            ohanaSharedPackage.getAuditReportsByUser.mockImplementationOnce(() => [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ]);
            await resolver(
                null,
                {input: {startDate: '2021-01-23', endDate: '2021-09-28'}},
                {
                    tenantId: 1,
                    userId: 1,
                    version: ohanaSharedPackage.CONSTANTS.CURRENT_SERVER_VERSION
                }
            );

            expect(ohanaSharedPackage.replaceAuditReport).toHaveBeenCalledTimes(1);
        });
    });
});
