const {
    getLogger,
    hasOpenEncounter,
    NotFoundError,
    isUserMappedToPatient,
    ForbiddenError,
    getPatientById,
    getChatHistory,
    createChatHistoryPayloadTemplate,
    extractOhanaId,
    getUsersByIds,
    createChatMemberTemplate,
    createChatMessageTemplate
} = require('ohana-shared');

async function ChatHistoryResolver(
    _parent,
    {patientId, limit, cursor},
    {tenantId, userId, mappedPatients, tenantShortCode}
) {
    const logger = getLogger('ChatHistoryResolver', {tenantId, userId, patientId});

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

    const chatHistoryResponse = await getChatHistory(
        patient.patientUlid,
        tenantShortCode,
        userId,
        limit,
        cursor
    );

    const senderUserIds = chatHistoryResponse.edges.map((edge) => {
        return extractOhanaId(edge?.node?.sentBy?.identity);
    });

    const users = await getUsersByIds(senderUserIds);
    const usersMap = new Map();
    users.forEach((user) => {
        usersMap.set(user.id, user);
    });

    return createChatHistoryPayloadTemplate({
        chatHistory: {
            pageInfo: chatHistoryResponse.pageInfo,
            unreadCount: chatHistoryResponse.unreadCount,
            edges: chatHistoryResponse.edges.map((edge) => {
                const user = usersMap.get(extractOhanaId(edge?.node?.sentBy?.identity));
                edge.node = createChatMessageTemplate({
                    ...edge.node,
                    sentBy: createChatMemberTemplate({
                        userId: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        title: user.title,
                        patientRelationship: user.patientRelationship
                    }),
                    cursor: edge.cursor
                });

                return edge;
            })
        }
    });
}

module.exports = ChatHistoryResolver;
