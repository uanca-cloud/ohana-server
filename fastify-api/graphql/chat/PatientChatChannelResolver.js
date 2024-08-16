const {
    getLogger,
    hasOpenEncounter,
    NotFoundError,
    isUserMappedToPatient,
    ForbiddenError,
    getPatientChatInformationByIdAndUserId,
    createPatientChatChannelTemplate,
    getChatChannelInformation,
    getLocationSetting,
    extractOhanaId,
    getChatUserInfoById,
    createChatMemberTemplate,
    CONSTANTS: {
        LOCATION_SETTINGS_KEYS: {CHAT_LOCATION_ENABLED}
    }
} = require('ohana-shared');

async function PatientChatChannelResolver(
    _parent,
    {patientId},
    {tenantId, userId, mappedPatients, tenantShortCode}
) {
    const logger = getLogger('PatientChatChannelResolver', {tenantId, userId});

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error('Patient does not have an active encounter');
        throw new NotFoundError({description: 'Patient does not have an ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patientId, mappedPatients))) {
        logger.error('Cannot look up a patient you are not mapped to');
        throw new ForbiddenError({message: 'Cannot look up a patient you are not mapped to'});
    }

    const patient = await getPatientChatInformationByIdAndUserId({id: patientId, tenantId}, userId);

    const chatEnabledOnLocation = await getLocationSetting({
        tenantId,
        locationId: patient?.location.id,
        key: CHAT_LOCATION_ENABLED
    });

    let chatChannelInformation = null;
    let sentByUser = null;
    let initialChat = null;
    let unreadCount = 0;
    let lastChat = null;
    if (patient?.patientUlid) {
        chatChannelInformation = await getChatChannelInformation(
            patient.patientUlid,
            tenantShortCode,
            userId
        );

        initialChat = chatChannelInformation.initialChats.edges[0];
        unreadCount = chatChannelInformation.initialChats.unreadCount;
        if (initialChat) {
            const sentByUserId = extractOhanaId(initialChat?.node?.sentBy?.identity);

            sentByUser = await getChatUserInfoById(sentByUserId);

            lastChat = {
                id: initialChat?.node?.id,
                order: initialChat?.node?.order,
                cursor: initialChat?.cursor,
                text: initialChat?.node?.text,
                createdAt: initialChat?.node?.createdAt,
                status: initialChat?.node?.status,
                metadata: initialChat?.node?.metadata,
                sentBy: createChatMemberTemplate({
                    userId: sentByUser?.id,
                    firstName: sentByUser?.firstName,
                    lastName: sentByUser?.lastName,
                    role: sentByUser?.role,
                    title: sentByUser?.title,
                    patientRelationship: sentByUser?.patientRelationship
                })
            };
        }
    }

    return createPatientChatChannelTemplate({
        patientId,
        unreadChatMessageCount: unreadCount,
        chatLocationEnabled: chatEnabledOnLocation?.value === 'true',
        chatPatientEnabled: patient?.enableChat,
        notificationLevel: chatChannelInformation?.notificationLevel ?? patient?.notificationLevel,
        lastChat
    });
}

module.exports = PatientChatChannelResolver;
