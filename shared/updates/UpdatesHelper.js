const uniqBy = require('lodash.uniqby'),
    {
        createAttachmentsTemplate,
        createUpdateTemplate,
        createCaregiverTemplate,
        createReadReceiptTemplate
    } = require('../EntitiesFactory'),
    {
        ATTACHMENTS_BASE_URL,
        CAREGIVER_EULA_LAST_CHANGED_DATE,
        MEDIA_TYPES: {QUICK_MESSAGE, PHOTO, USER_JOIN, TEXT},
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER}
    } = require('../constants'),
    {differenceInMilliseconds} = require('date-fns'),
    {getUpdatesByPatientId, removeUpdateByIds} = require('./UpdatesDao'),
    {rehydrateUser} = require('../user/UserCacheHelper'),
    {removeUserJoinAttachmentsByPatientId} = require('./AttachmentsDao'),
    {getLogger} = require('../logs/LoggingService');

/**
 *
 * @param updateData
 * @param {boolean} allowFreeTextTranslation
 * @returns {*}
 */
function getAttachmentsForUpdates(updateData, allowFreeTextTranslation) {
    const attachmentObject = {};

    for (const element of updateData) {
        if (!attachmentObject[element.update_id]) {
            attachmentObject[element.update_id] = [];
        }

        if (attachmentObject[element.update_id].some(update => update.id === element.attachment_id)) {
            continue;
        }

        attachmentObject[element.update_id].push(createAttachmentsTemplate({
            id: element.attachment_id,
            updateId: element.update_id,
            thumbUrl:
                element.type === PHOTO
                    ? `${ATTACHMENTS_BASE_URL}${element.attachment_id}/thumbnail`
                    : null,
            originalUrl:
                element.type === PHOTO
                    ? `${ATTACHMENTS_BASE_URL}${element.attachment_id}`
                    : null,
            type: element.type,
            quickMessages: element.type === QUICK_MESSAGE ? element.metadata : [],
            read: element.read,
            translations:
                allowFreeTextTranslation && element.type === TEXT ? element.metadata : [],
            invitedByFirstName:
                element.type === USER_JOIN ? element.metadata?.invitedByFirstName : '',
            invitedByLastName:
                element.type === USER_JOIN ? element.metadata?.invitedByLastName : '',
            invitedByUserType:
                element.type === USER_JOIN ? element.metadata?.invitedByUserType : '',
            inviteeName: element.type === USER_JOIN ? element.metadata?.inviteeName : '',
            inviteeRelationship:
                element.type === USER_JOIN ? element.metadata?.inviteeRelationship : ''
        }));
    }

    return attachmentObject;
}

/**
 *
 * @param updateData
 * @param {boolean} allowFreeTextTranslation
 * @returns {Promise<Array<{id: String, text: String, createdAt: String, caregiver: {id: String, tenant: {id: String}, role: String, firstName: String, lastName: String, title: String, acceptedEula: boolean}, attachments: Array, read: boolean, readReceipts: Array}>>}
 */
async function getUniqueUpdates(updateData, allowFreeTextTranslation) {
    const readReceipts = await getReadReceiptsForUpdates(updateData);
    const attachments = getAttachmentsForUpdates(updateData, allowFreeTextTranslation);

    return uniqBy(
        updateData.map((entry) =>
            createUpdateTemplate({
                id: entry.id,
                text: entry.message,
                createdAt: entry.created_at.toISOString(),
                caregiver: createCaregiverTemplate({
                    id: entry.user_id,
                    tenant: {
                        id: entry.tenant_id
                    },
                    role: entry.assigned_roles.includes(FAMILY_MEMBER) ? FAMILY_MEMBER : CAREGIVER,
                    assignedRoles: entry.assigned_roles,
                    firstName: entry.first_name,
                    lastName: entry.last_name,
                    title: entry.title,
                    acceptedEula:
                        differenceInMilliseconds(
                            new Date(entry.last_eula_acceptance_timestamp),
                            new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                        ) >= 0,
                    renewEula: !!entry.last_eula_acceptance_timestamp
                }),
                attachments: attachments[entry.id] || [],
                read: entry.read,
                readReceipts: readReceipts[entry.id] || []
            })
        ),
        'id'
    );
}

/**
 *
 * @param patientId
 * @param {boolean} allowFreeTextTranslation
 * @returns {Promise<Array<{id: String, text: String, createdAt: String, caregiver: {id: String, tenant: {id: String}, role: String, firstName: String, lastName: String, title: String, acceptedEula: boolean}, attachments: Array, read: boolean, readReceipts: Array}>|*[]>}
 */
async function getUpdates(patientId, allowFreeTextTranslation) {
    const logger = getLogger('UpdatesHelper::getUpdates', {patientId});
    let rawUpdates;

    if (patientId) {
        logger.debug('Retrieving list of updates for patient...');
        rawUpdates = await getUpdatesByPatientId(patientId);
    }

    if (!rawUpdates) {
        logger.debug('There are no updates for this patient.');
        return [];
    }

    return getUniqueUpdates(rawUpdates, allowFreeTextTranslation);
}

/**
 * Remove updates and user join attachments for patient ids
 * @param patientId
 * @param dbClient
 * @returns {Promise<void>}
 */
async function removeUserJoinUpdatesByPatientId(patientId, dbClient) {
    const updateIds = await removeUserJoinAttachmentsByPatientId(patientId, dbClient);
    await removeUpdateByIds(updateIds, dbClient);
}

async function getReadReceiptsForUpdates(updateData) {
    const readReceipts = {};
    for (const entry of updateData) {
        if (!readReceipts[entry.id]) {
            readReceipts[entry.id] = [];
        }

        const user = await rehydrateUser(entry.read_by);
        if (
            user &&
            !readReceipts[entry.id].some((readEntry) => readEntry.user.id === entry.read_by)
        ) {
            readReceipts[entry.id].push(
                createReadReceiptTemplate({
                    user,
                    timestamp: entry.read_at
                })
            );
        }
    }
    return readReceipts;
}

module.exports = {
    getAttachmentsForUpdates,
    getUniqueUpdates,
    getUpdates,
    removeUserJoinUpdatesByPatientId,
    getReadReceiptsForUpdates
};
