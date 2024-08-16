const {
    getLogger,
    initialHistory,
    extractOhanaId,
    CSAError,
    createInitialHistoryPayloadTemplate,
    setRedisInitialChatCounts,
    createUserDictionary,
    getPatientsByUser,
    createChatMemberTemplate
} = require('ohana-shared');

async function InitialHistoryResolver(_parent, _args, {tenantId, userId, tenantShortCode}) {
    const logger = getLogger('InitialHistoryResolver', {tenantId, userId});

    const patients = await getPatientsByUser({userId, tenantId});
    const channels = await initialHistory(tenantShortCode, userId);

    const edgesByPatientUlid = new Map();
    channels.edges.forEach((edge) => {
        edgesByPatientUlid.set(extractOhanaId(edge.node.seed), edge);
    });

    const userIds = [];
    const patientChatChannels = patients.map((patient) => {
        const edge = edgesByPatientUlid.get(patient.patientUlid);
        if (!edge) {
            // If CSA did not return an item for this patient then its channel has not been created yet and we return defaults
            return {
                patientId: patient.id,
                chatPatientEnabled: patient.enableChat,
                chatLocationEnabled: patient.chatLocationEnabled === 'true',
                unreadChatMessageCount: 0,
                notificationLevel: patient.notificationLevel,
                lastChat: null
            };
        } else {
            const initialChat = edge.node.initialChats.edges[0];
            if (!initialChat) {
                logger.error({channels}, 'Initial Chat from CSA is missing!');
                throw new CSAError({description: 'Initial Chat from CSA is missing!'});
            }
            const sentByUserId = extractOhanaId(initialChat.node.sentBy.identity);
            userIds.push(sentByUserId);
            return {
                patientId: patient.id,
                chatPatientEnabled: patient.enableChat,
                chatLocationEnabled: patient.chatLocationEnabled === 'true',
                unreadChatMessageCount: edge.node.initialChats.unreadCount,
                notificationLevel: edge.node.notificationLevel,
                lastChat: {
                    id: initialChat.node.id,
                    order: initialChat.node.order,
                    cursor: initialChat.cursor,
                    text: initialChat.node.text,
                    sentBy: sentByUserId,
                    createdAt: initialChat.node.createdAt,
                    status: initialChat.node.status,
                    metadata: initialChat.node.metadata
                }
            };
        }
    });

    const userDictionary = await createUserDictionary(userIds);

    // Assign user data into the response
    patientChatChannels.forEach((channel) => {
        if (channel.lastChat) {
            const relevantUser = userDictionary.get(channel.lastChat.sentBy);
            channel.lastChat.sentBy = createChatMemberTemplate({
                userId: channel.lastChat.sentBy,
                firstName: relevantUser.firstName,
                lastName: relevantUser.lastName,
                role: relevantUser.role,
                title: relevantUser.title,
                patientRelationship: relevantUser.patientRelationship
            });
        }
    });
    await setRedisInitialChatCounts(userId, patientChatChannels);
    logger.debug(patientChatChannels);
    return createInitialHistoryPayloadTemplate({patientChatChannels});
}

module.exports = InitialHistoryResolver;
