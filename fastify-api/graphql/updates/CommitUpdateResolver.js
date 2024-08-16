const {
        CONSTANTS: {
            AUDIT_EVENTS: {UPDATE_SET},
            REDIS_COLLECTIONS: {CAREGIVER_UPDATES},
            PUSH_NOTIFICATIONS_TYPES: {NEW_UPDATE},
            MEDIA_TYPES: {TEXT, PHOTO, QUICK_MESSAGE},
            PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_TITLE,
            PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_BODY,
            PUSH_NOTIFICATION_DEFAULT_TEXT_MEDIA_NAME,
            CAREGIVER_EULA_LAST_CHANGED_DATE,
            TENANT_SETTINGS_KEYS: {FREE_TEXT_TRANSLATION_FLAG},
            LOCALES,
            DEFAULT_AZURE_LANGUAGE_CODE,
            RATE_LIMIT_EXPIRATION_IN_SEC,
            TRANSLATION_RATE_LIMIT,
            DISABLE_RATE_LIMITING
        },
        createUpdate,
        validateUpdate,
        getRedisCollectionData,
        delRedisCollectionData,
        createNotificationHub,
        sendPushNotification,
        generatePushNotificationPayload,
        getFamilyMemberDevices,
        getPatientByEncounterId,
        createAuditEvent,
        createCaregiverTemplate,
        getAttachmentsByUpdateId,
        NotFoundError,
        getLogger,
        formatDeviceId,
        translateText,
        createAttachment,
        getTenantSetting,
        getFamilyMembersByPatientId,
        getChatCountForPatientId,
        getUnreadUpdatesByPatientId
    } = require('ohana-shared'),
    rateLimit = require('../RateLimit'),
    {differenceInMilliseconds} = require('date-fns'),
    template = require('lodash.template'),
    {v4: uuid} = require('uuid');

async function CommitUpdateResolver(_parent, args, context) {
    const logger = getLogger('CommitUpdateResolver', context);
    const {
        userId,
        role,
        assignedRoles,
        tenantId,
        firstName,
        lastName,
        title,
        deviceId,
        deviceName,
        version,
        buildNumber,
        osVersion,
        deviceModel,
        email,
        eulaAcceptTimestamp
    } = context;

    // Rate limiting free-text updates based on userId,
    // we shouldn't limit other types of updates like QMs since they don't have explicit costs attached to them
    const {encounterId, updateId, text, type} = args.input;
    if (!DISABLE_RATE_LIMITING && type === TEXT) {
        await rateLimit.fixed(
            {userId, reqLimit: +TRANSLATION_RATE_LIMIT, expireInSec: +RATE_LIMIT_EXPIRATION_IN_SEC},
            'commitUpdate'
        );
    }

    const notificationHubClient = await createNotificationHub();
    const metadata = {...logger.bindings()?.metadata, encounterId, updateId};

    const attachments = await getAttachmentsByUpdateId(updateId);
    const hasPhotoAttachments = attachments.some((attachment) => attachment.type === PHOTO);

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    validateUpdate(update, encounterId, userId);

    const patient = await getPatientByEncounterId(encounterId);
    if (!patient) {
        logger.error({metadata}, 'Patient not found');
        throw new NotFoundError({description: 'Patient not found'});
    }

    const result = await createUpdate({userId, updateId, text, patientId: patient.id, encounterId});
    if (!result) {
        logger.error({metadata}, 'Could not create update');
        throw new Error('Could not create update');
    }

    let recipients = await getFamilyMemberDevices(patient.id, tenantId);
    const pushNotificationMediaType = hasPhotoAttachments ? PHOTO : TEXT;

    const allowFreeTextTranslationSetting = await getTenantSetting({
        key: FREE_TEXT_TRANSLATION_FLAG,
        tenantId
    });
    const allowFreeTextTranslation =
        allowFreeTextTranslationSetting && allowFreeTextTranslationSetting.value === 'true';
    let translations = [];

    if (type === TEXT) {
        logger.debug({metadata}, 'Committing update of type text');
        if (allowFreeTextTranslation) {
            const familyMembers = await getFamilyMembersByPatientId(patient.id);

            if (familyMembers) {
                const preferredLocale = familyMembers.map(({preferredLocale}) => {
                    return LOCALES.find((locale) => {
                        return locale.id === preferredLocale;
                    });
                });
                translations = await translateText(
                    text,
                    DEFAULT_AZURE_LANGUAGE_CODE,
                    preferredLocale
                );
            }
        }

        await createAttachment({
            id: uuid(),
            updateId,
            encounterId,
            patientId: patient.id,
            metadata: translations,
            type: TEXT
        });
    }

    let qmUpdate = null;
    if (type === QUICK_MESSAGE) {
        logger.debug({metadata}, 'Committing update of type quick message');
        const quickMessages = attachments.find(
            (attachment) => attachment.type === QUICK_MESSAGE
        )?.quickMessages;
        qmUpdate = quickMessages?.map((qm) => qm.text).join();
    }

    await createAuditEvent({
        eventId: UPDATE_SET,
        patientId: patient.id,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${lastName}, ${firstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        updateContent: text,
        tenantId,
        updateId,
        locationId: patient?.location?.id,
        performingUserTitle: title,
        qmUpdate,
        externalId: patient?.externalId
    });

    if (recipients) {
        recipients = recipients.filter(
            (recipient) => recipient.firstName !== null && recipient.lastName !== null
        );

        await Promise.allSettled(
            recipients.map(async ({id: recipientId, notificationPlatform, appVersion}) => {
                const textualMediaType =
                    pushNotificationMediaType === TEXT
                        ? PUSH_NOTIFICATION_DEFAULT_TEXT_MEDIA_NAME
                        : pushNotificationMediaType;
                const unreadChatCount = await getChatCountForPatientId(recipientId, patient.id);
                const unreadUpdateCount = await getUnreadUpdatesByPatientId(
                    patient.id,
                    recipientId
                );
                const payload = await generatePushNotificationPayload(notificationPlatform, {
                    title: PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_TITLE,
                    body: template(PUSH_NOTIFICATION_TEMPLATE_NEW_UPDATE_BODY)({
                        mediaType: textualMediaType,
                        firstName,
                        title
                    }),
                    type: NEW_UPDATE,
                    mediaType: pushNotificationMediaType,
                    sender: {firstName, lastName, title},
                    userId: recipientId,
                    patientId: patient.id,
                    appVersion,
                    badge: unreadChatCount + unreadUpdateCount
                });

                await sendPushNotification(notificationHubClient, recipientId, payload);
            })
        );
    }

    await delRedisCollectionData(CAREGIVER_UPDATES, updateId);

    return {
        id: updateId,
        text,
        attachments,
        createdAt: new Date(result.rows[0].created_at).toISOString(),
        caregiver: createCaregiverTemplate({
            id: userId,
            tenant: {
                id: tenantId
            },
            role,
            assignedRoles,
            firstName,
            lastName,
            title,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(eulaAcceptTimestamp),
                    new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!eulaAcceptTimestamp
        })
    };
}

module.exports = CommitUpdateResolver;
