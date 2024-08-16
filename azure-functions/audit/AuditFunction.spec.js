let ohanaSharedPackage = null,
    auditFunction;

const consoleTimeMock = jest.spyOn(console, 'time').mockImplementation();
afterAll(() => {
    consoleTimeMock.mockRestore();
});
beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        bootstrapStorageAccount: jest.fn(() => {
            return {
                uploadBlockBlob: jest.fn(() => Promise.resolve()),
                getBlobClient: jest.fn(() => {
                    return {
                        downloadToBuffer: jest.fn(() => Buffer.from('test_buffer', 'utf8'))
                    };
                })
            };
        }),
        bootstrapAzf: jest.fn(() => {}),
        selectAuditEventReport: jest.fn(() => {
            return {
                id: '1234',
                name: `audit_report`,
                status: 'pending',
                statusDate: '2022-11-03',
                startDate: '2022-10-30',
                endDate: '2022-11-03',
                generatedDate: '2022-11-03'
            };
        }),
        generateAuditCSV: jest.fn(() => {}),
        uploadZIPFile: jest.fn(() => {}),
        uploadMediaAttachments: jest.fn(() => {}),
        selectAuditReportData: jest.fn(() => {
            return {
                templates: [
                    {
                        eventId: '1',
                        createdAt: new Date('2022-10-26T00:00:00.000Z').toISOString(),
                        externalId: '1244',
                        patientLocation: 'Test',
                        performingUserType: 'n/a',
                        performingUserDisplayName: 'n/a',
                        performingUserId: 'n/a',
                        title: 'n/a',
                        deviceId: 'n/a',
                        deviceModel: 'n/a',
                        osVersion: 'n/a',
                        appVersion: 'n/a',
                        scanStatus: 'n/a',
                        updateContent: 'n/a',
                        qmUpdate: 'n/a',
                        freeTextUpdate: 'n/a',
                        updateId: '411242114212',
                        invitationType: 'n/a',
                        familyDisplayName: 'n/a',
                        familyRelation: 'n/a',
                        familyLanguage: 'n/a',
                        familyContactNumber: 'n/a',
                        familyMemberType: 'n/a'
                    }
                ],
                updateIds: ['12345']
            };
        }),
        updateAuditEventReport: jest.fn(() => {})
    }));
    jest.mock('../../shared/updates/AttachmentsDao', () => {
        return {
            getAttachmentsByUpdateIds: jest.fn(() => [
                {
                    id: '2323232232',
                    updateId: '411242114212',
                    thumbUrl: 'thumbnailurl',
                    originalUrl: 'originalurl',
                    filename: 'filename',
                    type: 'photo'
                }
            ])
        };
    });
    jest.mock('fs');
    jest.mock(
        'adm-zip',
        () =>
            function () {
                this.addLocalFile = jest.fn(() => {});
                this.addLocal = jest.fn(() => {});
                this.toBuffer = jest.fn(() => Buffer.from('test', 'utf8'));
                this.addFile = jest.fn(() => {});
            }
    );
    jest.mock('@azure/abort-controller');

    ohanaSharedPackage = require('ohana-shared');
    auditFunction = require('./AuditFunction');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('fs');
});

describe('Given we want to generate an audit report', () => {
    describe('and the server is not bootstrapped', () => {
        test('then it should call the bootstrapAzf function', async () => {
            await auditFunction({}, JSON.stringify({version: '1.2.0'}));

            expect(ohanaSharedPackage.bootstrapAzf).toHaveBeenCalledTimes(1);
        });
    });

    describe('and the app version is smaller than the last supported version', () => {
        test('then it should return false', async () => {
            expect(await auditFunction({}, JSON.stringify({version: '1.1.0'}))).toBe(false);
        });
    });

    describe('and the audit event report does not exist', () => {
        test('then it should return false', async () => {
            ohanaSharedPackage.selectAuditEventReport.mockImplementationOnce(() => null);
            expect(
                await auditFunction(
                    {},
                    JSON.stringify({
                        version: '1.8.0',
                        auditReportId: '1',
                        tenantId: '12',
                        userId: '123'
                    })
                )
            ).toBe(false);
        });
    });

    describe('and the audit event report has status cancelled', () => {
        test('then it should return true', async () => {
            ohanaSharedPackage.selectAuditEventReport.mockImplementationOnce(() => {
                return {
                    id: '1234',
                    name: `audit_report`,
                    status: 'cancelled',
                    statusDate: '2022-11-03',
                    startDate: '2022-10-30',
                    endDate: '2022-11-03',
                    generatedDate: '2022-11-03'
                };
            });
            expect(
                await auditFunction(
                    {},
                    JSON.stringify({
                        version: '1.8.0',
                        auditReportId: '1',
                        tenantId: '12',
                        userId: '123'
                    })
                )
            ).toBe(true);
        });
    });

    describe('and an error occurs while appending data to the csv', () => {
        test('then it should return false, update audit report status to failed and format audit report column with n/a as updateId', async () => {
            ohanaSharedPackage.generateAuditCSV.mockImplementationOnce(() => {
                return Promise.reject(new Error());
            });

            expect(
                await auditFunction(
                    {},
                    JSON.stringify({
                        version: '1.8.0',
                        auditReportId: '1',
                        tenantId: '12',
                        userId: '123'
                    })
                )
            ).toBe(false);
            expect(ohanaSharedPackage.updateAuditEventReport).toHaveBeenCalledTimes(1);
            expect(ohanaSharedPackage.updateAuditEventReport).toHaveBeenLastCalledWith({
                auditReportId: '1',
                tenantId: '12',
                status: 'failed',
                metadata: null
            });
            expect(ohanaSharedPackage.generateAuditCSV).toHaveBeenCalledTimes(1);
        });
    });

    describe('and the zip is added successfully to storage with includeMedia false', () => {
        describe('and an audit report does not exist', () => {
            test('then it should return true and not call update audit report status', async () => {
                ohanaSharedPackage.selectAuditEventReport
                    .mockImplementationOnce(() => {
                        return {
                            id: '1234',
                            name: `audit_report`,
                            status: 'pending',
                            statusDate: '2022-11-03',
                            startDate: '2022-10-30',
                            endDate: '2022-11-03',
                            generatedDate: '2022-11-03'
                        };
                    })
                    .mockImplementationOnce(() => null);

                expect(
                    await auditFunction(
                        {},
                        JSON.stringify({
                            version: '1.8.0',
                            auditReportId: '1',
                            tenantId: '12',
                            userId: '123',
                            includeMedia: false
                        })
                    )
                ).toBe(true);
                expect(ohanaSharedPackage.updateAuditEventReport).toHaveBeenCalledTimes(0);
            });
        });

        describe('and report has a failed status', () => {
            test('then it should return true and not call update audit report status', async () => {
                ohanaSharedPackage.selectAuditEventReport
                    .mockImplementationOnce(() => {
                        return {
                            id: '1234',
                            name: `audit_report`,
                            status: 'pending',
                            statusDate: '2022-11-03',
                            startDate: '2022-10-30',
                            endDate: '2022-11-03',
                            generatedDate: '2022-11-03'
                        };
                    })
                    .mockImplementationOnce(() => {
                        return {
                            id: '1234',
                            name: `audit_report`,
                            status: 'failed',
                            statusDate: '2022-11-03',
                            startDate: '2022-10-30',
                            endDate: '2022-11-03',
                            generatedDate: '2022-11-03'
                        };
                    });

                expect(
                    await auditFunction(
                        {},
                        JSON.stringify({
                            version: '1.8.0',
                            auditReportId: '1',
                            tenantId: '12',
                            userId: '123',
                            includeMedia: false
                        })
                    )
                ).toBe(true);
                expect(ohanaSharedPackage.updateAuditEventReport).toHaveBeenCalledTimes(0);
            });
        });
    });
});
