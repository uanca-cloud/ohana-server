const {getLogger, getSession, AuthenticationError} = require('ohana-shared');

async function createUserContext(resolve, parent, args, context, info) {
    const logger = getLogger('CreateUserContextMiddleware', context);
    const {sessionId, version, buildNumber} = context;
    let user = await getSession(sessionId);
    if (!user) {
        logger.error('User does not exist');
        throw new AuthenticationError({message: 'User does not exist'});
    }

    const {
        tenantId,
        role,
        assignedRoles,
        userId,
        firstName,
        lastName,
        title = '',
        deviceId = '',
        deviceName = '',
        osVersion = '',
        deviceModel = '',
        sessionInactivityTimeoutInSecs,
        email,
        eulaAcceptTimestamp,
        mappedPatients = [],
        tenantShortCode,
        patientRelationship
    } = user;

    //Add tenantId to the context.
    const newContext = {
        ...context,
        tenantId,
        role,
        assignedRoles,
        userId,
        firstName,
        lastName,
        title,
        deviceId,
        deviceName,
        osVersion,
        deviceModel,
        sessionInactivityTimeoutInSecs,
        email,
        eulaAcceptTimestamp,
        version,
        buildNumber,
        mappedPatients,
        tenantShortCode,
        patientRelationship
    };

    return resolve(parent, args, newContext, info);
}

const middlewareMapping = {
    Patient: {
        unreadUpdateCount: createUserContext
    },
    Query: {
        familyPatient: createUserContext,
        patients: createUserContext,
        patient: createUserContext,
        locations: createUserContext,
        quickMessagesByPatient: createUserContext,
        locationQuickMessages: createUserContext,
        tenantSettings: createUserContext,
        locationSettings: createUserContext,
        auditReportJobs: createUserContext,
        auditReportResources: createUserContext,
        user: createUserContext,
        findPatientInformation: createUserContext,
        locationFixedContents: createUserContext,
        fixedContents: createUserContext,
        chatHistory: createUserContext,
        initialHistory: createUserContext,
        chatMembers: createUserContext,
        patientChatChannel: createUserContext,
        getWebSocketUrl: createUserContext
    },
    Mutation: {
        createLocation: createUserContext,
        updatePushNotificationsConfig: createUserContext,
        enrollPatient: createUserContext,
        updatePatient: createUserContext,
        rescanPatient: createUserContext,
        assignCaregiverToPatient: createUserContext,
        generateFamilyInvitationUrlByPatient: createUserContext,
        generateFamilyInvitationSmsByPatient: createUserContext,
        finalizeFamilyMemberRegistration: createUserContext,
        updateFamilyMember: createUserContext,
        removeFamilyMember: createUserContext,
        updateLocation: createUserContext,
        removeLocation: createUserContext,
        updateLocationQuickMessage: createUserContext,
        updateUserQuickMessages: createUserContext,
        createUpdate: createUserContext,
        rollbackUpdate: createUserContext,
        markUpdateAsRead: createUserContext,
        commitUpdate: createUserContext,
        createLocationQuickMessage: createUserContext,
        deleteLocationQuickMessage: createUserContext,
        updateTenantSetting: createUserContext,
        updateLocationSetting: createUserContext,
        updateLocationQuickMessagesOrder: createUserContext,
        addQuickMessageAttachmentOnUpdate: createUserContext,
        removeAttachmentOnUpdate: createUserContext,
        removeMediaAttachmentOnUpdate: createUserContext,
        endSession: createUserContext,
        createAuditReport: createUserContext,
        cancelAuditReport: createUserContext,
        updateEULAAcceptanceStatus: createUserContext,
        createLocationFixedContent: createUserContext,
        updateLocationFixedContent: createUserContext,
        removeLocationFixedContent: createUserContext,
        updateLocationFixedContentsOrder: createUserContext,
        disassociatePatient: createUserContext,
        sendChatMessage: createUserContext,
        toggleChatForPatient: createUserContext,
        markChatMessagesAsRead: createUserContext,
        changeNotificationLevelForPatient: createUserContext
    }
};

module.exports = middlewareMapping;
