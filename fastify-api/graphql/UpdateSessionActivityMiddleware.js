const {updateSession} = require('ohana-shared');

async function updateSessionActivity(resolve, parent, args, context, info) {
    const {sessionId, role, userId, sessionInactivityTimeoutInSecs} = context;

    await updateSession(role, sessionId, parseInt(sessionInactivityTimeoutInSecs), userId);

    return resolve(parent, args, context, info);
}

const middlewareMapping = {
    Query: {
        familyPatient: updateSessionActivity,
        patients: updateSessionActivity,
        patient: updateSessionActivity,
        locations: updateSessionActivity,
        quickMessagesByPatient: updateSessionActivity,
        locationQuickMessages: updateSessionActivity,
        locales: updateSessionActivity,
        tenantSettings: updateSessionActivity,
        locationSettings: updateSessionActivity,
        user: updateSessionActivity,
        findPatientInformation: updateSessionActivity,
        locationFixedContents: updateSessionActivity,
        fixedContents: updateSessionActivity,
        chatHistory: updateSessionActivity,
        initialHistory: updateSessionActivity,
        chatMembers: updateSessionActivity,
        patientChatChannel: updateSessionActivity
    },
    Mutation: {
        updatePushNotificationsConfig: updateSessionActivity,
        enrollPatient: updateSessionActivity,
        updatePatient: updateSessionActivity,
        rescanPatient: updateSessionActivity,
        assignCaregiverToPatient: updateSessionActivity,
        generateFamilyInvitationUrlByPatient: updateSessionActivity,
        generateFamilyInvitationSmsByPatient: updateSessionActivity,
        finalizeFamilyMemberRegistration: updateSessionActivity,
        updateFamilyMember: updateSessionActivity,
        removeFamilyMember: updateSessionActivity,
        createLocation: updateSessionActivity,
        updateLocation: updateSessionActivity,
        removeLocation: updateSessionActivity,
        updateLocationQuickMessage: updateSessionActivity,
        updateUserQuickMessages: updateSessionActivity,
        createUpdate: updateSessionActivity,
        rollbackUpdate: updateSessionActivity,
        markUpdateAsRead: updateSessionActivity,
        commitUpdate: updateSessionActivity,
        createLocationQuickMessage: updateSessionActivity,
        deleteLocationQuickMessage: updateSessionActivity,
        updateTenantSetting: updateSessionActivity,
        updateLocationSetting: updateSessionActivity,
        updateLocationQuickMessagesOrder: updateSessionActivity,
        removeAttachmentOnUpdate: updateSessionActivity,
        updateEULAAcceptanceStatus: updateSessionActivity,
        createLocationFixedContent: updateSessionActivity,
        updateLocationFixedContent: updateSessionActivity,
        removeLocationFixedContent: updateSessionActivity,
        updateLocationFixedContentsOrder: updateSessionActivity,
        disassociatePatient: updateSessionActivity,
        sendChatMessage: updateSessionActivity,
        toggleChatForPatient: updateSessionActivity,
        markChatMessagesAsRead: updateSessionActivity,
        changeNotificationLevelForPatient: updateSessionActivity
    }
};
module.exports = middlewareMapping;
