const {
        addPatientChatChannelInformation,
        getPatientById,
        getUserIdsLinkedToPatient,
        createChatChannel,
        sendChatMessage,
        getLogger,
        hasOpenEncounter,
        NotFoundError,
        isUserMappedToPatient,
        ForbiddenError,
        createChatMessageTemplate,
        createChatMemberTemplate,
        CONSTANTS: {
            OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER},
            CSA_PRODUCT_OID,
            CHAT_CURSOR_PREFIX,
            AUDIT_EVENTS: {CHAT_MESSAGE_SENT},
            FAMILY_MEMBER_TYPES: {PRIMARY, SECONDARY},
            NOTIFICATION_LEVELS: {LOUD}
        },
        isChatEnabled,
        ChatDisabledError,
        getUserData,
        createAuditEvent,
        formatDeviceId,
        getFamilyMember,
        getPreferredLanguage,
        updateChatNotificationLevel
    } = require('ohana-shared'),
    ULID = require('ulid');

async function SendChatMessageResolver(
    _parent,
    args,
    {
        tenantId,
        userId,
        firstName,
        lastName,
        role,
        version,
        buildNumber,
        deviceModel,
        osVersion,
        deviceId,
        deviceName,
        email,
        title,
        mappedPatients,
        tenantShortCode,
        patientRelationship
    }
) {
    const {patientId, text, metadata} = args.input;

    const logger = getLogger('SendChatMessageResolver', {tenantId, userId, patientId});

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error('Patient does not have any ongoing encounter');
        throw new NotFoundError({description: 'Patient does not have any ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patientId, mappedPatients))) {
        logger.error('Cannot look up a patient you are not mapped to');
        throw new ForbiddenError({message: 'Cannot look up a patient you are not mapped to'});
    }

    const patient = await getPatientById({id: patientId, tenantId});
    let channelId = patient?.patientUlid;

    if (!(await isChatEnabled(patient, tenantId))) {
        logger.error('Chat is not enabled for this patient or their location');
        throw new ChatDisabledError({
            description: 'Chat is not enabled for this patient or their location'
        });
    }

    if (!channelId && role === FAMILY_MEMBER) {
        logger.error('Patient does not have an open chat channel');
        throw new NotFoundError({description: 'Patient does not have an open chat channel'});
    }

    if (!channelId && role === CAREGIVER) {
        logger.debug('Generating patient ulid...');
        const patientUlid = ULID.ulid();

        const users = await getUserIdsLinkedToPatient(patientId, tenantId);

        await createChatChannel(patientUlid, userId, tenantShortCode, users);

        await addPatientChatChannelInformation(patientId, patientUlid, tenantId, userId);
        channelId = patientUlid;

        await updateChatNotificationLevel({
            patientId,
            patientUlid,
            userId,
            tenantShortCode,
            notificationLevel: LOUD
        });
    }

    let jsonMetadata = {};
    if (metadata) {
        jsonMetadata = JSON.parse(metadata);
    }
    if (!jsonMetadata[CSA_PRODUCT_OID]) {
        jsonMetadata[CSA_PRODUCT_OID] = {};
    }
    jsonMetadata[CSA_PRODUCT_OID].senderDeviceId = deviceId;

    const chatMessage = await sendChatMessage(
        channelId,
        tenantShortCode,
        userId,
        text,
        JSON.stringify(jsonMetadata)
    );

    let family_member = {};
    if (role === FAMILY_MEMBER) {
        const familyMember = await getFamilyMember(userId);
        family_member = {
            familyRelation: familyMember?.patientRelationship,
            familyDisplayName: `${familyMember?.lastName}, ${familyMember?.firstName}`,
            familyLanguage: getPreferredLanguage(familyMember?.preferredLocale),
            familyMemberType: familyMember?.primary ? PRIMARY : SECONDARY,
            familyContactNumber: familyMember?.phoneNumber
        };
    }

    await createAuditEvent({
        eventId: CHAT_MESSAGE_SENT,
        patientId: patient.id,
        performingUserEmail: email,
        userType: role,
        userDisplayName:
            role === FAMILY_MEMBER ? family_member.familyDisplayName : `${lastName}, ${firstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        tenantId,
        performingUserTitle: title,
        messageContent: text,
        locationId: patient.location?.id || null,
        externalId: role === CAREGIVER ? patient.externalId : null,
        ...family_member
    });

    let user = createChatMemberTemplate({
        userId,
        firstName,
        lastName,
        role,
        title,
        patientRelationship
    });

    if (role === FAMILY_MEMBER) {
        const userData = await getUserData(userId);
        user = {...user, ...userData};
    }

    return createChatMessageTemplate({
        id: chatMessage.id,
        order: chatMessage.order,
        cursor: `${CHAT_CURSOR_PREFIX}:${chatMessage.order}`,
        text: chatMessage.text,
        sentBy: user,
        createdAt: chatMessage.createdAt,
        status: chatMessage.status,
        metadata: chatMessage.metadata
    });
}

module.exports = SendChatMessageResolver;
