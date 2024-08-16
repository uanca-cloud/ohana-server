const groupBy = require('lodash.groupby');
const {updateAuditEventReport} = require('./audit/AuditEventsReportsDao');
const {
        INVITATION_TYPES: {SMS, QR_CODE, OTHER},
        AUDIT_EVENT_REPORT_HEADERS,
        AZURE_MEDIA_CONTAINER_NAME,
        AUDIT_MAX_ARCHIVE_SIZE_IN_BYTES,
        AZURE_AUDIT_CONTAINER_NAME
    } = require('./constants'),
    {AsYouType} = require('libphonenumber-js');
const {getLogger} = require('./logs/LoggingService');
const {getAttachmentsByUpdateIds} = require('./updates/AttachmentsDao');
const {appendToCsvFile} = require('./CsvHelper');
const {
    AUDIT_REPORTS_STATUS_ENUM: {REPORT_FAILED}
} = require('./constants');
const {bootstrapStorageAccount} = require('./AzureStorageAccountGateway');
const AdmZip = require('adm-zip');

function invitationTypeColumnFormatter(type) {
    if (!type) {
        return 'n/a';
    }

    if (type === OTHER) {
        return 'Other';
    }

    if (type === QR_CODE) {
        return 'QR Code';
    }

    if (type === SMS) {
        return 'SMS';
    }

    return 'n/a';
}

function escapeQuotationMarks(text) {
    return text ? '"' + text.replace(/"/g, '""') + '"' : 'n/a';
}

function formatPhoneNumber(value) {
    if (!value) {
        return value;
    }
    const currentValue = value.replace(/[^\d]/g, '');
    const cvLength = currentValue.length;
    if (cvLength <= 10) {
        return new AsYouType('US').input(currentValue);
    } else {
        return new AsYouType().input(`+${currentValue}`);
    }
}

function auditReportColumnFormatter(data) {
    return [
        data.eventId,
        data.createdAt,
        data.externalId,
        data.patientLocation,
        data.performingUserType,
        data.performingUserDisplayName,
        data.performingUserId,
        data.title,
        data.deviceId,
        data.deviceModel,
        data.osVersion,
        data.appVersion,
        data.scanStatus,
        data.updateContent,
        data.qmUpdate,
        data.freeTextUpdate,
        data.updateId,
        data.invitationType,
        data.familyDisplayName,
        data.familyRelation,
        data.familyLanguage,
        data.familyContactNumber,
        data.familyMemberType,
        data.messageContent
    ];
}

async function getPhotoAttachmentsForAudit(updateIds) {
    const attachments = await getAttachmentsByUpdateIds(updateIds);

    const {photo: photos} = groupBy(attachments, (attachment) => attachment.type);

    return photos ?? [];
}

async function generateAuditCSV(csvPath, photoAttachments, auditReportData) {
    await appendToCsvFile(csvPath, AUDIT_EVENT_REPORT_HEADERS);

    for (const data of auditReportData) {
        if (!photoAttachments?.some((attachment) => attachment.updateId === data.updateId)) {
            data.updateId = 'n/a';
        }

        await appendToCsvFile(csvPath, auditReportColumnFormatter(data));
    }
}

async function uploadZIPFile(myQueueItem, zip, reportFolderName, folderCounter, abortSignal) {
    const logger = getLogger('AuditEventsHelper', myQueueItem);
    const {auditReportId, tenantId, userId} = JSON.parse(myQueueItem);
    const auditContainerClient = bootstrapStorageAccount(AZURE_AUDIT_CONTAINER_NAME);

    try {
        const zipBuffer = zip.toBuffer();
        const uploadStartTime = Date.now();
        await auditContainerClient.uploadBlockBlob(
            `${tenantId}/${userId}/${reportFolderName}_${folderCounter}.zip`,
            zipBuffer,
            zipBuffer.length,
            {
                blobHTTPHeaders: {blobContentType: 'application/zip'},
                abortSignal
            }
        );
        const uploadEndTime = Date.now() - uploadStartTime;
        logger.debug({metadata: {duration: uploadEndTime}}, 'Uploaded zip file');
    } catch (error) {
        if (error.name !== 'AbortError') {
            await updateAuditEventReport({
                auditReportId,
                tenantId,
                status: REPORT_FAILED,
                metadata: null
            });
        }
        logger.error({metadata: {reportFolderName, folderCounter}, error}, 'Zip upload failed.');
    }

    return {
        filename: `${reportFolderName}_${folderCounter}.zip`,
        filePath: `${tenantId}/${userId}/${reportFolderName}_${folderCounter}.zip`,
        url: `${auditContainerClient.url}/${tenantId}/${userId}/${reportFolderName}_${folderCounter}.zip`
    };
}

async function uploadMediaAttachments(
    myQueueItem,
    zip,
    photoAttachments,
    reportFolderName,
    abortSignal
) {
    const logger = getLogger('AuditEventsHelper', myQueueItem);
    const {auditReportId, tenantId} = JSON.parse(myQueueItem);
    const mediaContainerClient = bootstrapStorageAccount(AZURE_MEDIA_CONTAINER_NAME);
    let folderCounter = 1;
    let zipSize = zip.toBuffer().length;
    let metadata = [];

    for (const photo of photoAttachments) {
        const iterationStartTime = Date.now();

        try {
            const blobClientStartTime = Date.now();
            const blobClient = mediaContainerClient.getBlobClient(
                `${photo.encounterId}/${photo.updateId}/${photo.originalFilename}`
            );
            const fileBuffer = await blobClient.downloadToBuffer(0, undefined, {abortSignal});
            const blobClientEndTime = Date.now() - blobClientStartTime;
            logger.debug({metadata: {duration: blobClientEndTime}}, 'Retrieved BLOB client');

            // If the maximum size is about to be exceeded then upload before proceeding and reset the zip
            if (zipSize + fileBuffer.length > AUDIT_MAX_ARCHIVE_SIZE_IN_BYTES) {
                metadata.push(
                    await uploadZIPFile(
                        myQueueItem,
                        zip,
                        reportFolderName,
                        folderCounter,
                        abortSignal
                    )
                );
                folderCounter++;
                zip = new AdmZip();
                zipSize = 0;
            }

            zipSize += fileBuffer.length;
            zip.addFile(`${photo.updateId}/${photo.originalFilename}`, fileBuffer);

            const iterationEndTime = Date.now() - iterationStartTime;
            logger.debug({metadata: {duration: iterationEndTime}}, 'Iteration ended');
        } catch (error) {
            if (error.name !== 'AbortError') {
                await updateAuditEventReport({
                    auditReportId,
                    tenantId,
                    status: REPORT_FAILED,
                    metadata: null
                });
            }
            logger.error({error}, 'Error downloading assets');
        }
    }

    metadata.push(
        await uploadZIPFile(myQueueItem, zip, reportFolderName, folderCounter, abortSignal)
    );

    return metadata;
}

module.exports = {
    invitationTypeColumnFormatter,
    escapeQuotationMarks,
    formatPhoneNumber,
    auditReportColumnFormatter,
    getPhotoAttachmentsForAudit,
    generateAuditCSV,
    uploadZIPFile,
    uploadMediaAttachments
};
