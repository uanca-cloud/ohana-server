let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./AuditReportResourcesResolver');
    ohanaSharedPackage = require('ohana-shared');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getAuditReportResourcesByUser: jest.fn(() => [
            'https://sadevohanadev.blob.core.windows.net/audit/1/321/voalte_family_audit_log_2021.01.23_2021.09.28.zip?temporaryToken'
        ])
    }));
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get audit report resources', () => {
    describe('when input is provided', () => {
        test('then it should return audit report resource', async () => {
            const result = await resolver(
                null,
                {id: 'bddce2db-6f44-4223-aa41-3e4620255815'},
                {tenantId: 1, userId: 1}
            );

            expect(result).toEqual(
                expect.arrayContaining([
                    'https://sadevohanadev.blob.core.windows.net/audit/1/321/voalte_family_audit_log_2021.01.23_2021.09.28.zip?temporaryToken'
                ])
            );
        });
    });

    describe('when an active encounter does not exist', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getAuditReportResourcesByUser.mockImplementationOnce(() => []);

            resolver(
                null,
                {id: 'bddce2db-6f44-4223-aa41-3e4620255815'},
                {tenantId: 1, userId: 1}
            ).then((result) => {
                expect(result).toEqual(expect.arrayContaining([]));
            });
        });
    });
});
