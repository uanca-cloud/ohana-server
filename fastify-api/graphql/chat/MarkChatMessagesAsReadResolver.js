const {
    getLogger,
    hasOpenEncounter,
    NotFoundError,
    isUserMappedToPatient,
    ForbiddenError,
    getPatientById,
    markChatMessagesAsRead,
    createChatMessageTemplate,
    extractOhanaId,
    getUsersByIds,
    createChatMemberTemplate,
    createAuditEvent,
    formatDeviceId,
    CONSTANTS: {
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER},
        AUDIT_EVENTS: {CHAT_MESSAGES_READ},
        FAMILY_MEMBER_TYPES: {PRIMARY, SECONDARY}
    },
    getFamilyMember,
    getPreferredLanguage
} = require('ohana-shared');

async function MarkChatMessagesAsReadResolver(
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
        tenantShortCode
    }
) {
    const {patientId, orderNumbers} = args.input;
    const logger = getLogger('MarkChatMessagesAsReadResolver', {tenantId, userId});

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error('Patient does not have an ongoing encounter');
        throw new NotFoundError({description: 'Patient does not have an ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patientId, mappedPatients))) {
        logger.error('Cannot look up a patient you are not mapped to');
        throw new ForbiddenError({message: 'Cannot look up a patient you are not mapped to'});
    }

    const patient = await getPatientById({id: patientId, tenantId});

    if (!patient?.patientUlid) {
        logger.error('Patient does not have an open chat channel');
        throw new NotFoundError({description: 'Patient does not have an open chat channel'});
    }

    const markMessagesAsReadResponse = await markChatMessagesAsRead(
        patient.patientUlid,
        tenantShortCode,
        userId,
        orderNumbers
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

    const auditEventTemplate = {
        eventId: CHAT_MESSAGES_READ,
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
        performingUserTitle: role === CAREGIVER ? title : null,
        messageContent: null,
        locationId: patient.location?.id || null,
        externalId: patient.externalId,
        ...family_member
    };

    const promises = markMessagesAsReadResponse.map(({text}) => {
        const eventTemplate = {
            ...auditEventTemplate,
            messageContent: text
        };
        return createAuditEvent(eventTemplate);
    });

    await Promise.all(promises);

    const senderUserIds = markMessagesAsReadResponse.map((chatMessage) => {
        return extractOhanaId(chatMessage?.sentBy);
    });

    const users = await getUsersByIds(senderUserIds);
    const usersMap = users.reduce((acc, user) => acc.set(user.id, user), new Map());

    return markMessagesAsReadResponse.map((chatMessage) => {
        const user = usersMap.get(extractOhanaId(chatMessage?.sentBy));

        return createChatMessageTemplate({
            id: chatMessage?.id,
            order: chatMessage?.order,
            text: chatMessage?.text,
            sentBy: createChatMemberTemplate({
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                title: user.title,
                patientRelationship: user.patientRelationship
            }),
            createdAt: chatMessage.createdAt,
            status: chatMessage.status,
            metadata: chatMessage?.metadata
        });
    });
}

module.exports = MarkChatMessagesAsReadResolver;
