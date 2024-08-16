let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('date-fns/sub', () => () => {
        const sub = jest.requireActual('date-fns/sub');

        return {
            ...sub,
            sub: jest.fn(() => 23)
        };
    });

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        runWithTransaction: (cb) => cb({}),
        CONSTANTS: {
            TENANT_SETTINGS_KEYS: {AUDIT_RETENTION: 'auditRetentionInDays'},
            AZURE_MEDIA_CONTAINER_NAME: '',
            THUMBNAIL_PREFIX: 'thumb_',
            DB_CONNECTION_POOLS: {DEFAULT: 'default'}
        },
        bootstrapStorageAccount: jest.fn(() => {
            return {
                deleteBlob: jest.fn(() => true)
            };
        }),
        getKeySettings: jest.fn(() => {
            return [
                {
                    tenantId: '1',
                    key: 'auditRetentionInDays',
                    value: '1'
                }
            ];
        }),
        deleteTenantAuditEvents: jest.fn(() => {}),
        removeAttachmentById: jest.fn(() => true),
        getAttachmentsForClosedEncounters: jest.fn(() => {
            return [
                {
                    id: 'ec779aa6-cef9-4f91-a185-3ff912a7d831',
                    updateId: 'd0a6b403-3174-4497-bf04-108432821b73',
                    encounterId: 1,
                    originalFilename: '189479014_625181348877627_4487600698281956797_n.jpeg'
                }
            ];
        }),
        bootstrapAzf: jest.fn(() => {}),
        getDatabasePool: jest.fn()
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CleanupAuditEventsScheduledFunction');
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('Given we want to remove events, which includes azure blobs (by the encounter and update id) and attachments (by the client)', () => {
    const myTimer = {
        scheduleStatus: {
            lastUpdated: '01-01-2023'
        }
    };

    test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
        await resolver(null, myTimer);

        expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
    });

    test('then the tenantSettingsForAuditRetention ill be retrieved', async () => {
        await resolver(null, myTimer);

        expect(ohanaSharedPackage.getKeySettings).toBeCalledTimes(1);
    });

    describe('given there are tenantSettingsForAuditRetention returned', () => {
        test('then the getAttachmentsForClosedEncounters and deleteTenantAuditEvents functions should be called', async () => {
            ohanaSharedPackage.getKeySettings.mockResolvedValue( [
                {
                    tenantId: '1',
                    key: 'auditRetentionInDays',
                    value: '1'
                }
            ]);
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.getAttachmentsForClosedEncounters).toBeCalledTimes(1);
            expect(ohanaSharedPackage.deleteTenantAuditEvents).toBeCalledTimes(1);
        });
    });

    describe('given there arent any tenantSettingsForAuditRetention returned', () => {
        beforeEach(() => {
            ohanaSharedPackage.getKeySettings.mockImplementation(() => null);
        });

        test('then the tenantSettingsForAuditRetention will be retrieved', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.getKeySettings).toBeCalledTimes(1);
        });

        test('then the getAttachmentsForClosedEncounters function will not be called', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.getAttachmentsForClosedEncounters).not.toBeCalled();
        });

        test('then deleteTenantAuditEvents function will not be called', async () => {
            await resolver(null, myTimer);

            await expect(ohanaSharedPackage.deleteTenantAuditEvents).not.toBeCalled();
        });
    });
});
