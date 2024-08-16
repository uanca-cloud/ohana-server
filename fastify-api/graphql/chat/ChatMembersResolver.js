const {
    getPatientById,
    extractOhanaId,
    createUserDictionary,
    createChatMembersPayloadTemplate,
    hasOpenEncounter,
    isUserMappedToPatient,
    getChatMembers,
    ForbiddenError,
    NotFoundError,
    getLogger,
    CONSTANTS: {
        OHANA_ROLES: {FAMILY_MEMBER}
    },
    createChatMemberTemplate
} = require('ohana-shared');

async function ChatMembersResolver(
    _parent,
    args,
    {tenantId, userId, mappedPatients, tenantShortCode}
) {
    const {patientId, limit, offset} = args;
    const logger = getLogger('ChatMembersResolver', {tenantId, userId, patientId});

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

    const chatMemberResponse = await getChatMembers(
        tenantShortCode,
        userId,
        patient.patientUlid,
        limit,
        offset
    );
    const userIds = [];
    chatMemberResponse.edges.forEach((edge) => {
        if (edge.node.metadata) {
            userIds.push(extractOhanaId(edge.node.identity));
        }
    });
    const userDictionary = await createUserDictionary(userIds);
    const edges = [];
    chatMemberResponse.edges.forEach((edge) => {
        const relevantUser = userDictionary.get(extractOhanaId(edge.node.identity));
        if (relevantUser && (edge.node.active || relevantUser.role === FAMILY_MEMBER)) {
            edge.node = createChatMemberTemplate({
                userId: relevantUser.id,
                firstName: relevantUser.firstName,
                lastName: relevantUser.lastName,
                role: relevantUser.role,
                title: relevantUser.title,
                patientRelationship: relevantUser.patientRelationship
            });
            edges.push(edge);
        }
    });
    return createChatMembersPayloadTemplate({
        edges,
        pageInfo: chatMemberResponse.pageInfo
    });
}

module.exports = ChatMembersResolver;
