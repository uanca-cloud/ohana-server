let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getAuditReportsAssets: jest.fn(() => {
            return [
                {
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
                }
            ];
        }),
        bootstrapStorageAccount: jest.fn(() => {
            const blobs = [
                {name: 'voalte_family_audit_log_2021.01.23_2021.09.28_2022-01-01T00:00:00.000Z'},
                {name: 'test'}
            ];
            return {
                listBlobsFlat: jest.fn(() => blobs),
                deleteBlob: jest.fn(() => true)
            };
        }),
        bootstrapAzf: jest.fn(() => {}),
        CONSTANTS: {
            AZURE_AUDIT_CONTAINER_NAME: ''
        }
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CleanupAuditAttachmentsScheduledFunction');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to remove certain audit attachments', () => {
    describe('given a list of blobs is returned from the bootstrap Storage Account', () => {
        const myTimer = {
            scheduleStatus: {
                lastUpdated: '01-01-2023'
            }
        };

        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then the necessaryAssets function should be called to return the assets that should be kept', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.getAuditReportsAssets).toBeCalledTimes(1);
        });

        test('then the deleteBlob function should be called because there are attachments to be removed', async () => {
            await resolver(null, myTimer);

            await expect(ohanaSharedPackage.bootstrapStorageAccount.deleteBlob).resolves;
        });
    });
});
