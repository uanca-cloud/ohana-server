const {
    getRedisCollectionData,
    CONSTANTS: {
        REDIS_COLLECTIONS: {CAREGIVER_UPDATES},
        MEDIA_TYPES: {QUICK_MESSAGE},
        DEFAULT_LOCALE
    },
    validateUpdate,
    getLocationQuickMessageById,
    createAttachment,
    getFamilyMembersByPatientId,
    createUpdateQuickMessageAttachmentTemplate,
    NotFoundError,
    getLogger,
    getPatientByEncounterId
} = require('ohana-shared');

async function AddQuickMessageAttachmentOnUpdateResolver(_parent, args, context) {
    const logger = getLogger('AddQuickMessageAttachmentOnUpdateResolver', context);
    const {userId, tenantId} = context;
    const {encounterId, updateId, quickMessageId} = args.input;
    const metadata = {...logger.bindings()?.metadata, encounterId, updateId, quickMessageId};

    const update = await getRedisCollectionData(CAREGIVER_UPDATES, updateId);
    validateUpdate(update, encounterId, userId);

    const patient = await getPatientByEncounterId(encounterId);
    if (!patient) {
        logger.error({metadata}, 'Could not find patient for encounter');
        throw new NotFoundError({description: 'Could not find patient for encounter'});
    }

    const quickMessage = await getLocationQuickMessageById(quickMessageId, tenantId);
    if (!quickMessage) {
        logger.error({metadata}, 'Could not find quick message');
        throw new NotFoundError({description: 'Could not find quick message'});
    }

    const familyMembers = await getFamilyMembersByPatientId(patient.id);
    const quickMessagesAttachments = [];

    if (familyMembers.length > 0) {
        familyMembers.map((familyMember) => {
            let quickMessageAttachment = null;

            if (familyMember) {
                // do not add duplicate locale quick messages
                if (
                    quickMessagesAttachments.some(
                        (message) => message.locale === familyMember.preferredLocale
                    )
                ) {
                    return;
                }

                quickMessageAttachment = quickMessage.find((message) => {
                    if (familyMember.preferredLocale) {
                        return message.locale === familyMember.preferredLocale;
                    }
                });
            }

            if (!quickMessageAttachment) {
                // do not add duplicate default locale quick messages
                if (quickMessagesAttachments.some((message) => message.locale === DEFAULT_LOCALE)) {
                    return;
                }
                quickMessageAttachment = quickMessage.find(
                    (message) => message.locale === DEFAULT_LOCALE
                );
            }

            if (quickMessageAttachment) {
                quickMessagesAttachments.push(quickMessageAttachment);
            }
        });
    } else {
        const quickMessageAttachment = quickMessage.find(
            (message) => message.locale === DEFAULT_LOCALE
        );

        if (quickMessageAttachment) {
            quickMessagesAttachments.push(quickMessageAttachment);
        }
    }

    await createAttachment({
        id: quickMessageId,
        updateId,
        encounterId,
        patientId: patient.id,
        metadata: quickMessagesAttachments,
        type: QUICK_MESSAGE
    });

    return createUpdateQuickMessageAttachmentTemplate({
        id: quickMessageId,
        type: QUICK_MESSAGE,
        quickMessages: quickMessagesAttachments
    });
}

module.exports = AddQuickMessageAttachmentOnUpdateResolver;
