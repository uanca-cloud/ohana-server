const Location = {
    id: null,
    label: null
};

const AuditReportResult = {
    id: null,
    name: null,
    status: null,
    statusDate: null,
    startDate: null,
    endDate: null,
    generatedDate: null
};

const Patient = {
    id: null,
    externalId: null,
    externalIdType: null,
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    encounterId: null,
    location: {...Location},
    lastUpdatedAt: null,
    lastEncounterId: null,
    familyMembers: [],
    updates: [],
    caregivers: [],
    allowSecondaryFamilyMembers: null,
    patientUlid: null,
    enableChat: null,
    chatLocationEnabled: null,
    unreadUpdateCount: null
};

const Caregiver = {
    id: null,
    tenant: {
        id: null
    },
    role: null,
    assignedRoles: null,
    title: null,
    firstName: null,
    lastName: null,
    acceptedEula: null,
    renewEula: null
};

const Attachments = {
    id: null,
    encounterId: null,
    updateId: null,
    thumbUrl: null,
    originalUrl: null,
    originalFilename: null,
    type: null,
    quickMessages: []
};

const Update = {
    id: null,
    text: null,
    createdAt: null,
    caregiver: {...Caregiver},
    attachments: [],
    read: false,
    readReceipts: []
};

const ReadReceipt = {
    user: [],
    timestamp: null
};

const User = {
    id: null,
    tenant: {
        id: null
    },
    role: null,
    assignedRoles: null,
    firstName: null,
    lastName: null,
    acceptedEula: null,
    renewEula: null
};

const FamilyMember = {
    id: null,
    tenant: {
        id: null
    },
    role: null,
    assignedRoles: null,
    firstName: null,
    lastName: null,
    phoneNumber: null,
    patientRelationship: null,
    preferredLocale: null,
    invitedBy: null,
    primary: null,
    acceptedEula: null,
    renewEula: null,
    isPatient: null
};

const Session = {
    id: null,
    user: {...FamilyMember},
    createdAt: null,
    expiresAt: null
};

const DeviceInfo = {
    deviceId: null,
    deviceName: null,
    osVersion: null,
    deviceModel: null,
    userId: null,
    deviceToken: null,
    iv: null,
    notificationPlatform: null,
    appVersion: null,
    registrationId: null
};

const FamilyMemberIdentity = {
    publicKey: null,
    userId: null,
    patientId: null,
    patientRelationship: null,
    preferredLocale: null,
    primary: null,
    invitedBy: null,
    isPatient: null
};

const TenantSetting = {
    tenantId: null,
    key: null,
    value: null
};

const LocationSetting = {
    key: null,
    value: null
};

const LocationFixedContent = {
    id: null,
    title: null,
    url: null,
    color: null,
    order: null
};

const AuditEvent = {
    eventId: null,
    createdAt: null,
    externalId: null,
    patientLocation: null,
    performingUserType: null,
    performingUserDisplayName: null,
    performingUserId: null,
    title: null,
    deviceId: null,
    deviceModel: null,
    osVersion: null,
    appVersion: null,
    scanStatus: null,
    updateContent: null,
    qmUpdate: null,
    updateId: null,
    invitationType: null,
    familyDisplayName: null,
    familyRelation: null,
    familyLanguage: null,
    familyContactNumber: null,
    messageContent: null
};

const ChatMessage = {
    id: null,
    order: null,
    cursor: null,
    text: null,
    sentBy: null,
    createdAt: null,
    status: null,
    metadata: null
};

const ChatHistoryPayload = {
    chatHistory: {
        edges: [],
        pageInfo: {
            hasNextPage: null,
            startCursor: null,
            endCursor: null,
            totalCount: null,
            offset: null
        },
        unreadCount: null
    }
};

const ChatMember = {
    userId: null,
    firstName: null,
    lastName: null,
    role: null,
    title: null,
    patientRelationship: null
};

const ChatMembersPayload = {
    edges: [
        {
            node: {...ChatMember},
            cursor: null
        }
    ],
    pageInfo: {
        hasNextPage: null,
        startCursor: null,
        endCursor: null,
        totalCount: null,
        offset: null
    }
};

const PatientChatChannel = {
    patientId: null,
    unreadChatMessageCount: null,
    chatLocationEnabled: null,
    chatPatientEnabled: null,
    notificationLevel: null,
    lastChat: {...ChatMessage}
};

const InitialHistoryPayload = {
    patientChatChannels: [{...PatientChatChannel}]
};

function createAuditReportResultTemplate(options = {}) {
    return {...AuditReportResult, ...options};
}

function createAuditEventResultTemplate(options = {}) {
    return {...AuditEvent, ...options};
}

function createLocationTemplate(options = {}) {
    return {...Location, ...options};
}

function createPatientTemplate(options = {}) {
    return {...Patient, ...options};
}

function createCaregiverTemplate(options = {}) {
    return {...Caregiver, ...options};
}

function createSessionTemplate(options = {}) {
    return {...Session, ...options};
}

function createDeviceInfoTemplate(options = {}) {
    return {...DeviceInfo, ...options};
}

function createFamilyMemberTemplate(options = {}) {
    return {...FamilyMember, ...options};
}

function createFamilyMemberIdentityTemplate(options = {}) {
    return {...FamilyMemberIdentity, ...options};
}

function createUpdateTemplate(options = {}) {
    return {...Update, ...options};
}

function createReadReceiptTemplate(options = {}) {
    return {...ReadReceipt, ...options};
}

function createTenantSettingTemplate(options = {}) {
    return {...TenantSetting, ...options};
}

function createLocationSettingTemplate(options = {}) {
    return {...LocationSetting, ...options};
}

function createLocationFixedContentTemplate(options = {}) {
    return {...LocationFixedContent, ...options};
}

function createAttachmentsTemplate(options = {}) {
    return {...Attachments, ...options};
}

function createUpdateQuickMessageAttachmentTemplate(options = {}) {
    return {...Attachments, ...options};
}

function createUserTemplate(options = {}) {
    return {...User, ...options};
}

function createChatMessageTemplate(options = {}) {
    return {...ChatMessage, ...options};
}

function createChatHistoryPayloadTemplate(options = {}) {
    return {...ChatHistoryPayload, ...options};
}

function createChatMembersPayloadTemplate(options = {}) {
    return {...ChatMembersPayload, ...options};
}

function createChatMemberTemplate(options = {}) {
    return {...ChatMember, ...options};
}

function createInitialHistoryPayloadTemplate(options = {}) {
    return {...InitialHistoryPayload, ...options};
}

function createPatientChatChannelTemplate(options = {}) {
    return {...PatientChatChannel, ...options};
}

module.exports = {
    createFamilyMemberIdentityTemplate,
    createFamilyMemberTemplate,
    createPatientTemplate,
    createLocationTemplate,
    createCaregiverTemplate,
    createSessionTemplate,
    createDeviceInfoTemplate,
    createUpdateTemplate,
    createReadReceiptTemplate,
    createTenantSettingTemplate,
    createLocationSettingTemplate,
    createLocationFixedContentTemplate,
    createAttachmentsTemplate,
    createUpdateQuickMessageAttachmentTemplate,
    createUserTemplate,
    createAuditReportResultTemplate,
    createAuditEventResultTemplate,
    createChatMessageTemplate,
    createChatHistoryPayloadTemplate,
    createInitialHistoryPayloadTemplate,
    createChatMembersPayloadTemplate,
    createChatMemberTemplate,
    createPatientChatChannelTemplate
};
