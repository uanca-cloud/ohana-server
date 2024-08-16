const {
    CONSTANTS: {
        AUDIT_EVENTS: {FAMILY_READ},
        OHANA_ROLES: {FAMILY_MEMBER},
        FAMILY_MEMBER_TYPES: {PRIMARY, SECONDARY},
        DEFAULT_LOCALE,
        MEDIA_TYPES: {QUICK_MESSAGE, USER_JOIN, TEXT},
        TENANT_SETTINGS_KEYS: {FREE_TEXT_TRANSLATION_FLAG}
    },
    createAuditEvent,
    markUpdatesAsRead,
    getPatientsByUser,
    getUserByUserId,
    formatDeviceId,
    getPreferredLanguage,
    NotFoundError,
    getAttachmentsByUpdateId,
    getLogger,
    getTenantSetting,
    rehydrateUser,
    getUpdateByUpdateIds
} = require('ohana-shared');

async function MarkUpdateAsReadResolver(_parent, args, context) {
    const logger = getLogger('MarkUpdateAsReadResolver', context);
    const {
        tenantId,
        userId,
        deviceId,
        deviceName,
        osVersion,
        deviceModel,
        version,
        buildNumber,
        role
    } = context;
    const {updateIds} = args;

    const user = await getUserByUserId(userId);
    if (!user) {
        logger.error('User not found');
        throw new NotFoundError({description: 'User not found'});
    }

    const patients = await getPatientsByUser({userId, tenantId: user.tenant.id});
    if (!patients.length) {
        logger.error('Patient not found');
        throw new NotFoundError({description: 'Patient not found'});
    }

    const updates = await getUpdateByUpdateIds(updateIds, userId);
    const validUpdatedIds = updates.map((ud) => ud.id);
    if (updateIds.length !== validUpdatedIds.length) {
        logger.error('Update not found');
        throw new NotFoundError({
            description: 'Update not found'
        });
    }

    const patientId = patients[0].id;
    const locationId = patients[0]?.location?.id;

    const readUpdateIds = await markUpdatesAsRead(updateIds, userId, patientId);
    await rehydrateUser(userId, user);

    if (!readUpdateIds.length) {
        logger.error('Update not found or it has already been marked as read');
        throw new NotFoundError({
            description: 'Update not found or it has already been marked as read'
        });
    }

    for (const update of updates) {
        // If we have a custom translation sent in the read update, we show that in the updateContent
        const attachments = await getAttachmentsByUpdateId(update.id);
        // We ignore family join updates when creating the family_read event
        if (attachments.find((attachment) => attachment.type === USER_JOIN)) {
            continue;
        }

        const qmArray = [];
        const freeTextArray = [];
        const allowFreeTextTranslationSetting = await getTenantSetting({
            key: FREE_TEXT_TRANSLATION_FLAG,
            tenantId
        });
        const allowFreeTextTranslation =
            allowFreeTextTranslationSetting && allowFreeTextTranslationSetting.value === 'true';
        attachments.forEach((attachment) => {
            if (attachment.type === QUICK_MESSAGE) {
                const qmTranslation = attachment.quickMessages
                    .filter((qm) => qm.locale === user.preferredLocale)
                    .map((qm) => qm.text);
                qmArray.push(
                    qmTranslation.length !== 0
                        ? qmTranslation
                        : attachment.quickMessages
                              .filter((qm) => qm.locale === DEFAULT_LOCALE)
                              .map((qm) => qm.text)
                );
            }

            if (attachment.type === TEXT && allowFreeTextTranslation) {
                const textTranslation = attachment.translations
                    .filter((qm) => qm.locale === user.preferredLocale)
                    .map((qm) => qm.text);
                freeTextArray.push(
                    textTranslation.length !== 0
                        ? textTranslation
                        : attachment.translations
                              .filter((translation) => translation.locale === DEFAULT_LOCALE)
                              .map((translation) => translation.text)
                );
            }
        });

        let qmUpdate = null;
        if (qmArray.length > 0) {
            qmUpdate = qmArray.join();
        }

        let freeTextUpdate = null;
        if (freeTextArray.length > 0) {
            freeTextUpdate = freeTextArray.join();
        }

        if (user.role === FAMILY_MEMBER) {
            await createAuditEvent({
                tenantId,
                eventId: FAMILY_READ,
                patientId,
                userType: role,
                userDisplayName: `${user.lastName}, ${user.firstName}`,
                deviceId: formatDeviceId(deviceName, deviceId),
                osVersion,
                deviceModel,
                version,
                buildNumber,
                updateContent: update.text,
                familyDisplayName: `${user.lastName}, ${user.firstName}`,
                familyRelation: user.patientRelationship,
                familyLanguage: getPreferredLanguage(user.preferredLocale),
                familyContactNumber: user.phoneNumber,
                familyMemberType: user.primary ? PRIMARY : SECONDARY,
                locationId,
                updateId: update.id,
                qmUpdate,
                freeTextUpdate,
                externalId: patients[0]?.externalId
            });
        }
    }

    return updates;
}

module.exports = MarkUpdateAsReadResolver;
