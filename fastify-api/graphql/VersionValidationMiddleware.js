const {getLogger, UnsupportedVersionError, ltLastSupportedVersion} = require('ohana-shared');

async function versionValidationMiddleware(resolve, parent, args, context, info) {
    const logger = getLogger('VersionValidationMiddleware', context);
    if (ltLastSupportedVersion(context.version)) {
        logger.error('Version not supported');
        throw new UnsupportedVersionError({message: 'Version not supported'});
    }

    return resolve(parent, args, context, info);
}

const middlewareMapping = {
    Query: {
        familyPatient: versionValidationMiddleware,
        patients: versionValidationMiddleware,
        patient: versionValidationMiddleware,
        locations: versionValidationMiddleware,
        quickMessagesByPatient: versionValidationMiddleware,
        locationQuickMessages: versionValidationMiddleware,
        locales: versionValidationMiddleware,
        tenantSettings: versionValidationMiddleware,
        locationSettings: versionValidationMiddleware,
        patientRelationships: versionValidationMiddleware,
        externalIdTypesList: versionValidationMiddleware,
        authenticationChallenge: versionValidationMiddleware,
        registrationChallenge: versionValidationMiddleware,
        auditReportJobs: versionValidationMiddleware,
        auditReportResources: versionValidationMiddleware,
        user: versionValidationMiddleware,
        findPatientInformation: versionValidationMiddleware,
        locationFixedContents: versionValidationMiddleware,
        fixedContents: versionValidationMiddleware,
        chatHistory: versionValidationMiddleware,
        initialHistory: versionValidationMiddleware,
        chatMembers: versionValidationMiddleware,
        patientChatChannel: versionValidationMiddleware,
        getWebSocketUrl: versionValidationMiddleware
    },
    Mutation: {
        caregiverCreateOrRefreshSession: versionValidationMiddleware,
        adminCreateOrRefreshSession: versionValidationMiddleware,
        createLocation: versionValidationMiddleware,
        updatePushNotificationsConfig: versionValidationMiddleware,
        enrollPatient: versionValidationMiddleware,
        updatePatient: versionValidationMiddleware,
        rescanPatient: versionValidationMiddleware,
        assignCaregiverToPatient: versionValidationMiddleware,
        generateFamilyInvitationUrlByPatient: versionValidationMiddleware,
        generateFamilyInvitationSmsByPatient: versionValidationMiddleware,
        finalizeFamilyMemberRegistration: versionValidationMiddleware,
        updateFamilyMember: versionValidationMiddleware,
        removeFamilyMember: versionValidationMiddleware,
        updateLocation: versionValidationMiddleware,
        removeLocation: versionValidationMiddleware,
        updateLocationQuickMessage: versionValidationMiddleware,
        updateUserQuickMessages: versionValidationMiddleware,
        createUpdate: versionValidationMiddleware,
        rollbackUpdate: versionValidationMiddleware,
        markUpdateAsRead: versionValidationMiddleware,
        commitUpdate: versionValidationMiddleware,
        createLocationQuickMessage: versionValidationMiddleware,
        deleteLocationQuickMessage: versionValidationMiddleware,
        updateTenantSetting: versionValidationMiddleware,
        updateLocationSetting: versionValidationMiddleware,
        updateLocationQuickMessagesOrder: versionValidationMiddleware,
        addQuickMessageAttachmentOnUpdate: versionValidationMiddleware,
        removeAttachmentOnUpdate: versionValidationMiddleware,
        removeMediaAttachmentOnUpdate: versionValidationMiddleware,
        endSession: versionValidationMiddleware,
        authenticationResponse: versionValidationMiddleware,
        registrationResponse: versionValidationMiddleware,
        createAuditReport: versionValidationMiddleware,
        cancelAuditReport: versionValidationMiddleware,
        updateEULAAcceptanceStatus: versionValidationMiddleware,
        createLocationFixedContent: versionValidationMiddleware,
        updateLocationFixedContent: versionValidationMiddleware,
        removeLocationFixedContent: versionValidationMiddleware,
        updateLocationFixedContentsOrder: versionValidationMiddleware,
        disassociatePatient: versionValidationMiddleware,
        sendChatMessage: versionValidationMiddleware,
        toggleChatForPatient: versionValidationMiddleware,
        markChatMessagesAsRead: versionValidationMiddleware,
        changeNotificationLevelForPatient: versionValidationMiddleware
    }
};

module.exports = middlewareMapping;
