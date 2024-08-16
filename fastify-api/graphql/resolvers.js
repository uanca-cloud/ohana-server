const UpdatePushNotificationsConfigResolver = require('./device/UpdatePushNotificationsConfigResolver'),
    EnrollPatientResolver = require('./patient/EnrollPatientResolver'),
    UpdatePatientResolver = require('./patient/UpdatePatientResolver'),
    AssignCaregiverToPatientResolver = require('./patient/AssignCaregiverToPatientResolver'),
    PatientsResolver = require('./patient/PatientsResolver'),
    PatientResolver = require('./patient/PatientResolver'),
    LocationsResolver = require('./location/LocationsResolver'),
    ExternalIdTypesListResolver = require('./tenant/ExternalIdTypesListResolver'),
    UpdateTenantSettingResolver = require('./tenant/UpdateTenantSettingResolver'),
    TenantSettingsResolver = require('./tenant/TenantSettingsResolver'),
    LocationSettingsResolver = require('./location/LocationSettingsResolver'),
    UpdateLocationSettingResolver = require('./location/UpdateLocationSettingResolver'),
    AuthenticationChallengeResolver = require('./family/AuthenticationChallengeResolver'),
    RegistrationResponseResolver = require('./family/RegistrationResponseResolver'),
    RegistrationChallengeResolver = require('./family/RegistrationChallengeResolver'),
    AuthenticationResponseResolver = require('./family/AuthenticationResponseResolver'),
    AdminCreateOrRefreshSessionResolver = require('./session/AdminCreateOrRefreshSessionResolver'),
    CaregiverCreateOrRefreshSessionResolver = require('./session/CaregiverCreateOrRefreshSessionResolver'),
    GenerateFamilyInvitationUrlByPatientResolver = require('./family/GenerateFamilyInvitationUrlByPatientResolver'),
    GenerateFamilyInvitationSmsByPatientResolver = require('./family/GenerateFamilyInvitationSmsByPatientResolver'),
    FamilyRelationshipsResolver = require('./family/FamilyMemberRelationshipsResolver'),
    CreateLocationResolver = require('./location/CreateLocationResolver'),
    UpdateLocationResolver = require('./location/UpdateLocationResolver'),
    RemoveLocationResolver = require('./location/RemoveLocationResolver'),
    FinalizeFamilyMemberRegistrationResolver = require('./family/FinalizeFamilyMemberRegistrationResolver'),
    UpdateFamilyMemberResolver = require('./family/UpdateFamilyMemberResolver'),
    LocationQuickMessagesResolver = require('./quickMessages/LocationQuickMessagesResolver'),
    UpdateLocationQuickMessageResolver = require('./quickMessages/UpdateLocationQuickMessageResolver'),
    UpdateUserQuickMessagesResolver = require('./quickMessages/UpdateUserQuickMessagesResolver'),
    CreateUpdateResolver = require('./updates/CreateUpdateResolver'),
    RollbackUpdateResolver = require('./updates/RollbackUpdateResolver'),
    MarkUpdateAsReadResolver = require('./updates/MarkUpdateAsReadResolver'),
    CommitUpdateResolver = require('./updates/CommitUpdateResolver'),
    RemoveAttachmentOnUpdateResolver = require('./updates/RemoveAttachmentOnUpdateResolver'),
    RemoveMediaAttachmentOnUpdateResolver = require('./updates/RemoveMediaAttachmentOnUpdateResolver'),
    AddQuickMessageAttachmentOnUpdateResolver = require('./updates/AddQuickMessageAttachmentOnUpdateResolver'),
    LocalesResolver = require('./family/LocalesResolver'),
    CreateLocationQuickMessageResolver = require('./quickMessages/CreateLocationQuickMessageResolver'),
    DeleteLocationQuickMessageResolver = require('./quickMessages/DeleteLocationQuickMessageResolver'),
    FamilyPatientResolver = require('./family/FamilyPatientResolver'),
    EndSessionResolver = require('./session/EndSessionResolver'),
    UpdateLocationQuickMessagesOrderResolver = require('./quickMessages/UpdateLocationQuickMessagesOrderResolver'),
    CreateAuditReportResolver = require('./audit/CreateAuditReportResolver'),
    AuditReportJobsResolver = require('./audit/AuditReportJobsResolver'),
    CancelAuditReportResolver = require('./audit/CancelAuditReportResolver'),
    AuditReportResourcesResolver = require('./audit/AuditReportResourcesResolver'),
    RemoveFamilyMemberResolver = require('./family/RemoveFamilyMemberResolver'),
    UpdateEULAAcceptanceStatusResolver = require('./user/UpdateEULAAcceptanceStatusResolver'),
    UserResolver = require('./user/UserResolver'),
    FindPatientInformationResolver = require('./patient/FindPatientInformationResolver'),
    LocationFixedContentsResolver = require('./fixedContents/LocationFixedContentsResolver'),
    UpdateLocationFixedContentResolver = require('./fixedContents/UpdateLocationFixedContentResolver'),
    CreateLocationFixedContentResolver = require('./fixedContents/CreateLocationFixedContentResolver'),
    RemoveLocationFixedContentResolver = require('./fixedContents/DeleteLocationFixedContentResolver'),
    UpdateLocationFixedContentsOrderResolver = require('./fixedContents/UpdateLocationFixedContentsReorderResolver'),
    FixedContentsResolver = require('./fixedContents/FixedContentsResolver'),
    QuickMessagesByPatientResolver = require('./quickMessages/QuickMessagesByPatientResolver'),
    RescanPatientResolver = require('./patient/RescanPatientResolver'),
    DisassociatePatientResolver = require('./patient/DisassociatePatientResolver'),
    WatchChatResolver = require('./chat/WatchChatResolver'),
    WatchReadReceiptsResolver = require('./chat/WatchReadReceiptsResolver'),
    SendChatMessageResolver = require('./chat/SendChatMessageResolver'),
    ToggleChatForPatientResolver = require('./patient/ToggleChatForPatientResolver'),
    ChatHistoryResolver = require('./chat/ChatHistoryResolver'),
    InitialHistoryResolver = require('./chat/InitialHistoryResolver'),
    ChatMembersResolver = require('./chat/ChatMembersResolver'),
    PatientChatChannelResolver = require('./chat/PatientChatChannelResolver'),
    MarkChatMessagesAsReadResolver = require('./chat/MarkChatMessagesAsReadResolver'),
    GetWebSocketUrlResolver = require('./chat/GetWebSocketUrlResolver'),
    ChangeNotificationLevelForPatientResolver = require('./chat/ChangeNotificationLevelForPatientResolver'),
    UnreadUpdateCountPatientResolver = require('./patient/UnreadUpateCountPatientResolver'),
    {
        CONSTANTS: {
            MEDIA_TYPES: {TEXT, QUICK_MESSAGE, USER_JOIN},
            OHANA_ROLES: {FAMILY_MEMBER}
        }
    } = require('ohana-shared');

// Since load time matters in serverless, we need an explicit map of helloworld.  DO NOT dynamically load them based on file naming conventions.
const resolvers = {
    User: {
        __resolveType(user) {
            if (user.role === FAMILY_MEMBER) {
                return 'FamilyMember';
            }

            return 'Caregiver';
        }
    },
    UpdateAttachment: {
        __resolveType(attachments) {
            if (attachments.thumbUrl) {
                return 'UpdateMediaAttachment';
            }
            if (attachments.type === USER_JOIN) {
                return 'UpdateUserJoinAttachment';
            }
            if (attachments.type === TEXT) {
                return 'UpdateFreeTextTranslation';
            }
            if (attachments.type === QUICK_MESSAGE) {
                return 'UpdateQuickMessageAttachment';
            }
            return null;
        }
    },
    PatientOrCdrSkeleton: {
        __resolveType(patient) {
            if (patient?.location?.id && patient?.location?.label) {
                return 'Patient';
            }
            return 'PatientCdrSkeleton';
        }
    },
    Patient: {
        unreadUpdateCount: UnreadUpdateCountPatientResolver
    },
    ChatUpdate: {
        __resolveType(obj) {
            if (obj.__typeName) {
                return obj.__typeName;
            }
            return null;
        }
    },
    Query: {
        familyPatient: FamilyPatientResolver,
        patients: PatientsResolver,
        patient: PatientResolver,
        locations: LocationsResolver,
        registrationChallenge: RegistrationChallengeResolver,
        authenticationChallenge: AuthenticationChallengeResolver,
        patientRelationships: FamilyRelationshipsResolver,
        quickMessagesByPatient: QuickMessagesByPatientResolver,
        locationQuickMessages: LocationQuickMessagesResolver,
        locales: LocalesResolver,
        externalIdTypesList: ExternalIdTypesListResolver,
        tenantSettings: TenantSettingsResolver,
        locationSettings: LocationSettingsResolver,
        auditReportJobs: AuditReportJobsResolver,
        auditReportResources: AuditReportResourcesResolver,
        user: UserResolver,
        findPatientInformation: FindPatientInformationResolver,
        locationFixedContents: LocationFixedContentsResolver,
        fixedContents: FixedContentsResolver,
        chatHistory: ChatHistoryResolver,
        initialHistory: InitialHistoryResolver,
        chatMembers: ChatMembersResolver,
        patientChatChannel: PatientChatChannelResolver,
        getWebSocketUrl: GetWebSocketUrlResolver
    },
    Mutation: {
        updatePushNotificationsConfig: UpdatePushNotificationsConfigResolver,
        enrollPatient: EnrollPatientResolver,
        updatePatient: UpdatePatientResolver,
        rescanPatient: RescanPatientResolver,
        assignCaregiverToPatient: AssignCaregiverToPatientResolver,
        registrationResponse: RegistrationResponseResolver,
        authenticationResponse: AuthenticationResponseResolver,
        adminCreateOrRefreshSession: AdminCreateOrRefreshSessionResolver,
        caregiverCreateOrRefreshSession: CaregiverCreateOrRefreshSessionResolver,
        generateFamilyInvitationUrlByPatient: GenerateFamilyInvitationUrlByPatientResolver,
        generateFamilyInvitationSmsByPatient: GenerateFamilyInvitationSmsByPatientResolver,
        finalizeFamilyMemberRegistration: FinalizeFamilyMemberRegistrationResolver,
        updateFamilyMember: UpdateFamilyMemberResolver,
        removeFamilyMember: RemoveFamilyMemberResolver,
        createLocation: CreateLocationResolver,
        updateLocation: UpdateLocationResolver,
        removeLocation: RemoveLocationResolver,
        updateLocationQuickMessage: UpdateLocationQuickMessageResolver,
        updateUserQuickMessages: UpdateUserQuickMessagesResolver,
        createUpdate: CreateUpdateResolver,
        rollbackUpdate: RollbackUpdateResolver,
        markUpdateAsRead: MarkUpdateAsReadResolver,
        commitUpdate: CommitUpdateResolver,
        createLocationQuickMessage: CreateLocationQuickMessageResolver,
        deleteLocationQuickMessage: DeleteLocationQuickMessageResolver,
        endSession: EndSessionResolver,
        updateTenantSetting: UpdateTenantSettingResolver,
        updateLocationSetting: UpdateLocationSettingResolver,
        updateLocationQuickMessagesOrder: UpdateLocationQuickMessagesOrderResolver,
        removeAttachmentOnUpdate: RemoveAttachmentOnUpdateResolver,
        removeMediaAttachmentOnUpdate: RemoveMediaAttachmentOnUpdateResolver,
        addQuickMessageAttachmentOnUpdate: AddQuickMessageAttachmentOnUpdateResolver,
        createAuditReport: CreateAuditReportResolver,
        cancelAuditReport: CancelAuditReportResolver,
        updateEULAAcceptanceStatus: UpdateEULAAcceptanceStatusResolver,
        createLocationFixedContent: CreateLocationFixedContentResolver,
        updateLocationFixedContent: UpdateLocationFixedContentResolver,
        removeLocationFixedContent: RemoveLocationFixedContentResolver,
        updateLocationFixedContentsOrder: UpdateLocationFixedContentsOrderResolver,
        disassociatePatient: DisassociatePatientResolver,
        sendChatMessage: SendChatMessageResolver,
        toggleChatForPatient: ToggleChatForPatientResolver,
        markChatMessagesAsRead: MarkChatMessagesAsReadResolver,
        changeNotificationLevelForPatient: ChangeNotificationLevelForPatientResolver
    },
    Subscription: {
        watchChat: WatchChatResolver,
        watchReadReceipts: WatchReadReceiptsResolver
    }
};

module.exports = resolvers;
