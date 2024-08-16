const {
        invitationTypeColumnFormatter,
        escapeQuotationMarks,
        formatPhoneNumber,
        auditReportColumnFormatter
    } = require('./AuditEventsHelper'),
    {
        INVITATION_TYPES: {SMS, QR_CODE, OTHER}
    } = require('./constants');
const AdmZip = require('adm-zip');

let auditEventsHelper, csvHelper;

beforeEach(() => {
    jest.mock('./CsvHelper', () => {
        return {
            appendToCsvFile: jest.fn(() => {})
        };
    });
    jest.mock('./audit/AuditEventsReportsDao', () => {
        return {
            updateAuditEventReport: jest.fn(() => {})
        };
    });
    jest.mock('./constants', () => {
        return {
            ...jest.requireActual('./constants'),
            AUDIT_MAX_ARCHIVE_SIZE_IN_BYTES: 0
        };
    });
    jest.mock('./AzureStorageAccountGateway', () => {
        return {
            bootstrapStorageAccount: jest.fn(() => {
                return {
                    uploadBlockBlob: jest.fn(() => Promise.resolve()),
                    getBlobClient: jest.fn(() => {
                        return {
                            downloadToBuffer: jest.fn(() => Buffer.from('test_buffer', 'utf8'))
                        };
                    })
                };
            })
        };
    });
    jest.createMockFromModule('./AuditEventsHelper', () => ({
        ...jest.requireActual('./AuditEventsHelper')
    }));

    auditEventsHelper = require('./AuditEventsHelper');
    csvHelper = require('./CsvHelper');
});
describe('Given we want to format an invitation type field for the audit events table', () => {
    describe('When invitation type is null', () => {
        it('should return n/a', () => {
            const response = invitationTypeColumnFormatter(null);
            expect(response).toBe('n/a');
        });
    });

    describe('When invitation type is empty', () => {
        it('should return n/a', () => {
            const response = invitationTypeColumnFormatter('');
            expect(response).toBe('n/a');
        });
    });

    describe('When invitation type is an unknown type', () => {
        it('should return n/a', () => {
            const response = invitationTypeColumnFormatter('test');
            expect(response).toBe('n/a');
        });
    });

    describe('When invitation type is other', () => {
        it('should return Other', () => {
            const response = invitationTypeColumnFormatter(OTHER);
            expect(response).toBe('Other');
        });
    });

    describe('When invitation type is qr code', () => {
        it('should return Other', () => {
            const response = invitationTypeColumnFormatter(QR_CODE);
            expect(response).toBe('QR Code');
        });
    });

    describe('When invitation type is sms', () => {
        it('should return Other', () => {
            const response = invitationTypeColumnFormatter(SMS);
            expect(response).toBe('SMS');
        });
    });
});

describe('Given we want to escape the quotations mark from a string', () => {
    describe('When a null value is sent', () => {
        it('should return n/a', () => {
            const response = escapeQuotationMarks(null);

            expect(response).toBe('n/a');
        });
    });

    describe('When an empty value is sent', () => {
        it('should return n/a', () => {
            const response = escapeQuotationMarks('');

            expect(response).toBe('n/a');
        });
    });

    describe('When an a value with quotes is sent', () => {
        it('should return the value with escaped quotes', () => {
            const response = escapeQuotationMarks('test"test"');

            expect(response).toBe('"test""test"""');
        });
    });
});

describe('Given we want to format a phone number', () => {
    describe('When sending a null value', () => {
        it('should return null', () => {
            const response = formatPhoneNumber(null);

            expect(response).toBe(null);
        });
    });

    describe('When sending a value with a length shorter than 10', () => {
        it('should return the number in the US format', () => {
            const response = formatPhoneNumber('1234');

            expect(response).toBe('1 (234)');
        });
    });

    describe('When sending a value with a length equal to 10', () => {
        it('should return the number in the US format', () => {
            const response = formatPhoneNumber('1234567890');

            expect(response).toBe('1 (234) 567-890');
        });
    });

    describe('When sending a value with a length greater than 10', () => {
        it('should return the number in the international format', () => {
            const response = formatPhoneNumber('12345678901');

            expect(response).toBe('+1 234 567 8901');
        });
    });

    describe('When sending a value with other characters besides digits', () => {
        it('should remove the additional characters and return the number in the expected format', () => {
            const response = formatPhoneNumber('1289ab01');

            expect(response).toBe('1 (289) 01');
        });
    });
});

describe('Given we want to format the audit report column values', () => {
    test('then it should return the values as an ordered array', () => {
        expect(
            auditReportColumnFormatter({
                eventId: 'family_read',
                createdAt: new Date('2022-10-26T00:00:00.000Z'),
                externalId: '1234',
                patientLocation: 'Test',
                performingUserType: 'ApprovedUser',
                performingUserDisplayName: 'John Doe',
                performingUserId: '12',
                title: 'Caregiver',
                deviceId: '12',
                deviceModel: 'Iphone 12',
                osVersion: 'Ios-14',
                appVersion: '1.6.0',
                scanStatus: 'n/a',
                updateContent: 'test',
                qmUpdate: 'n/a',
                freeTextUpdate: 'test',
                updateId: '1',
                invitationType: 'QR',
                familyDisplayName: 'Jane Doe',
                familyRelation: 'Sister',
                familyLanguage: 'Spanish',
                familyContactNumber: '1234567890',
                familyMemberType: 'Primary',
                messageContent: 'Hi Test'
            })
        ).toStrictEqual([
            'family_read',
            new Date('2022-10-26T00:00:00.000Z'),
            '1234',
            'Test',
            'ApprovedUser',
            'John Doe',
            '12',
            'Caregiver',
            '12',
            'Iphone 12',
            'Ios-14',
            '1.6.0',
            'n/a',
            'test',
            'n/a',
            'test',
            '1',
            'QR',
            'Jane Doe',
            'Sister',
            'Spanish',
            '1234567890',
            'Primary',
            'Hi Test'
        ]);
    });
});

describe('Given we want to default updateId', () => {
    test('then it should keep the original updateId if a photoAttachment has that value', async () => {
        await auditEventsHelper.generateAuditCSV(
            '',
            [
                {
                    id: '2323232232',
                    updateId: '411242114212',
                    thumbUrl: 'thumbnailurl',
                    originalUrl: 'originalurl',
                    filename: 'filename',
                    type: 'photo'
                }
            ],
            [
                {
                    eventId: '1',
                    createdAt: '2022-10-26T00:00:00.000Z',
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
            ]
        );
        expect(csvHelper.appendToCsvFile).toHaveBeenCalledWith('', [
            '1',
            '2022-10-26T00:00:00.000Z',
            '1244',
            'Test',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            '411242114212',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a'
        ]);
    });
    test('then it should set the updateId value to "n/a" if no photoAttachments have that value', async () => {
        await auditEventsHelper.generateAuditCSV(
            '',
            [
                {
                    id: '2323232232',
                    thumbUrl: 'thumbnailurl',
                    originalUrl: 'originalurl',
                    filename: 'filename',
                    type: 'photo'
                }
            ],
            [
                {
                    eventId: '1',
                    createdAt: '2022-10-26T00:00:00.000Z',
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
            ]
        );
        expect(csvHelper.appendToCsvFile).toHaveBeenCalledWith('', [
            '1',
            '2022-10-26T00:00:00.000Z',
            '1244',
            'Test',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a',
            'n/a'
        ]);
    });
});

describe('Given we want to upload media', () => {
    describe('and is too large for a single upload', () => {
        test('then it should perform multiple uploads', async () => {
            expect(
                await auditEventsHelper.uploadMediaAttachments(
                    '{"userId":"userId","auditReportId":"auditReportId","tenantId":"tenantId"}',
                    new AdmZip(),
                    [''],
                    'audit_report',
                    null
                )
            ).toStrictEqual([
                {
                    filePath: 'tenantId/userId/audit_report_1.zip',
                    filename: 'audit_report_1.zip',
                    url: 'undefined/tenantId/userId/audit_report_1.zip'
                },
                {
                    filePath: 'tenantId/userId/audit_report_2.zip',
                    filename: 'audit_report_2.zip',
                    url: 'undefined/tenantId/userId/audit_report_2.zip'
                }
            ]);
        });
    });
});
