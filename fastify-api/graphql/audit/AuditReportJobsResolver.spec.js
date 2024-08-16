let resolver = null;

beforeEach(() => {
    resolver = require('./AuditReportJobsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getAuditReportsByUser: jest.fn(() => [
            {
                name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
                status: 'pending',
                id: '1f1742d4-21af-4eb9-81d6-d45a3f138853',
                statusDate: '2021-10-01',
                startDate: '2021-01-23',
                endDate: '2021-09-28'
            },
            {
                name: 'voalte_family_audit_log_2021.03.20_2021.07.20',
                status: 'complete',
                id: '1cc550f4-e4b2-4ab9-a1f7-d115c0c8387b',
                statusDate: '2021-10-01',
                startDate: '2021-03-20',
                endDate: '2021-07-20'
            }
        ])
    }));
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get audit reports', () => {
    describe('when input is provided', () => {
        test('then it should return all audit reports', async () => {
            const result = await resolver(null, null, {tenantId: 1, userId: 1});

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining(
                        {
                            name: 'voalte_family_audit_log_2021.01.23_2021.09.28',
                            status: 'pending',
                            id: '1f1742d4-21af-4eb9-81d6-d45a3f138853',
                            statusDate: '2021-10-01',
                            startDate: '2021-01-23',
                            endDate: '2021-09-28'
                        },
                        {
                            name: 'voalte_family_audit_log_2021.03.20_2021.07.20',
                            status: 'complete',
                            id: '1cc550f4-e4b2-4ab9-a1f7-d115c0c8387b',
                            statusDate: '2021-10-01',
                            startDate: '2021-03-20',
                            endDate: '2021-07-20'
                        }
                    )
                ])
            );
        });
    });
});
