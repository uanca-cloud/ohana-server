const {gql} = require('graphql-tag'),
    {
        RATE_LIMIT_EXPIRATION_IN_SEC,
        TRANSLATION_RATE_LIMIT,
        GENERATE_SMS_RATE_LIMIT
    } = require('./constants.js');

const schema = `
directive @grant(roles : [Role]) on FIELD_DEFINITION
directive @deprecated(reason: String = "Support for this field will be removed in the next release") on FIELD_DEFINITION
directive @version(version : String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
directive @rate_limit(reqLimit: Int, expireInSec: Int = ${RATE_LIMIT_EXPIRATION_IN_SEC}, strategy: String = "fixed") on FIELD_DEFINITION
directive @csa_integration on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

enum UpdateAttachmentType {
  photo
  video
  text
  quickMessage
  userJoin
}

enum Role {
  Administrator
  FamilyMember
  ApprovedUser
}

enum LocationSettingKey {
   patientAutoUnenrollmentInHours
   allowSecondaryFamilyMembers
   chatLocationEnabled
}

enum NotificationPlatform {
    gcm
    apns
}

enum TenantSettingKey {
    externalIdType
    outboundCallFormat
    auditRetentionInDays
    sessionInactivityCaregiverInHours
    sessionInactivityFamilyMemberInMinutes
    familyMemberLimit
    enableFreeText,
    enableMediaAttachment,
    enableAnalytics,
    enableFreeTextTranslation
}

enum AuditReportJobStatus {
    pending
    complete
    cancelled
    failed
}

type Session {
  id: ID
  user: User
  createdAt: String
  expiresAt: String
} 

type Tenant {
  id: ID
}

interface User {
  id: ID
  tenant: Tenant
  role: Role
  assignedRoles: [Role] 
  firstName: String
  lastName: String
  acceptedEula: Boolean
  renewEula: Boolean
}

type Caregiver implements User {
  id: ID
  tenant: Tenant
  role: Role
  assignedRoles: [Role] 
  firstName: String
  lastName: String
  title: String
  acceptedEula: Boolean
  renewEula: Boolean
}

type FamilyMember implements User {
  id: ID
  tenant: Tenant
  role: Role
  assignedRoles: [Role] 
  firstName: String
  lastName: String
  phoneNumber: String
  patientRelationship: String
  preferredLocale: String
  invitedBy: User
  primary: Boolean
  createdAt: String
  acceptedEula: Boolean
  renewEula: Boolean
  isPatient: Boolean
}

type LocalizedQuickMessage {
  text: String
  locale: String
}

type LocationQuickMessage {
  messageId: ID
  quickMessages: [LocalizedQuickMessage]
  locationId: String
}

type LocationSetting {
    key: LocationSettingKey
    value: String
}

type Locale {
   id: ID!
   country: String!
   language: String!
   azureLanguageCode: String
}

union PatientOrCdrSkeleton = Patient | PatientCdrSkeleton

type ExternalIdType {
    key: String!
    value: String!
}

type AuditReportJob {
    id: ID!
    name: String!
    startDate: String!
    endDate: String!
    status: AuditReportJobStatus
    # Date that represents when the report was generated, cancelled or it failed.
    statusDate: String!
    generatedDate: String!
}

type LocationFixedContent{ 
    id: ID!
    title: String!
    url: String!
    color: String!
    order: Int!
}

enum ChatMessageStatus {
    created
    read
}

type ChatMember {
    userId: String
    firstName: String
    lastName: String
    role: Role
    title: String
    patientRelationship: String
}

interface Node {
  id: ID!
}

type ChatMessage implements Node {
    id: ID!
    "BIGSERIAL, unique for each message regardless of channel it belongs to"
    order: Int
    "we use this for pagination"
    cursor: String
    text: String
    sentBy: ChatMember
    createdAt: String
    "no read receipts timestamp atm, status will be either created or read"
    status: ChatMessageStatus
    "JSON object with custom info"
    metadata: String
}

"""
Relay Connection definition for page data.  It is important to note that two types of paging can be made available 
with this definition:  offset-based and cursor-based.  This deviates from the Relay Connection spec but may be
necessary for some implementations.  See https://hill-rom.atlassian.net/wiki/spaces/CWSRD/pages/3823075552/Approaches+to+Paging+Implementations+in+GraphQL
"""
type PageInfo {
  "If a next page exists"
  hasNextPage: Boolean!
  
  "Cursor starting the page for cursor-based paging"
  startCursor: String
  
  "Cursor ending the page for cursor-based paging"
  endCursor: String
  
  "Number of nodes in the whole dataset"
  totalCount: Int!
  
  "The offset which was used to generate this page for offset/limit paging"
  offset: Int
}

interface Connection {
  edges: [ConnectionEdge]!
  pageInfo: PageInfo!
}

"""
Relay Connection Edge definition
"""
interface ConnectionEdge {
  node: Node!
  
  "Opaque string used to track edges in a page when using cursor-based paging" 
  cursor: String
}

"""
Relay Connection Edge Node definition
"""
interface Node {
  id: ID!
}

type ChatMessageConnection implements Connection {
    edges: [ChatMessageConnectionEdge]!
    pageInfo: PageInfo!
    "Count of all ChatMessages in the Channel that are not marked as read"
    unreadCount: Int
}

type ChatMessageConnectionEdge implements ConnectionEdge {
    node: ChatMessage!
    cursor: String
}

type ChatMemberConnection {
  edges: [ChatMemberConnectionEdge]!
  pageInfo: PageInfo!
}

type ChatMemberConnectionEdge {
  node: ChatMember!
  cursor: String
}

type ChatHistoryPayload {
  "Get paginated chat messages"
  chatHistory: ChatMessageConnection
}

enum NotificationLevel {
  loud
  mute
}

type PatientChatChannel {
  patientId: ID!
  unreadChatMessageCount: Int!
  "from admin location settings"
  chatLocationEnabled: Boolean!
  "on patient level"
  chatPatientEnabled: Boolean!
  notificationLevel: NotificationLevel!
  lastChat: ChatMessage
}

type InitialHistoryPayload {
  "A user may have multiple assigned patients if it's a CG"
  patientChatChannels: [PatientChatChannel]
}

type WebSocketUrlResponse {
    url: String!
}

"""
Common Expected Errors:
    Expected error code VALIDATION_ERROR - if input values are not valid
    Expected error code RESOURCE_UNAVAILABLE - if DB pool is not found
    Expected error code UNAUTHENTICATED - if session and user does not exist
    Expected error code UNSUPPORTED_VERSION_ERROR - if version is not supported
"""

type Query {
    # Look up a patient by a Family Member's ID associated with a Session
    # Returns only ongoing encounters
    # Expected error code NOT_FOUND - if no patient is found
    # Expected error code FORBIDDEN - if user is not authorized
    familyPatient: Patient @grant(roles: [FamilyMember])
 
    # List all patients for the authenticated Caregiver
    # Returns only patients with ongoing encounters
    # Expected error code UNEXPECTED_ERROR - if db transaction fails while finding patients
    # Expected error code FORBIDDEN - if user is not authorized
    patients: [Patient] @grant(roles: [ApprovedUser])
    
    # Lookup a Patient by its ID
    # Returns only patient with ongoing encounter
    # Expected error code NOT_FOUND - if patient does not have any ongoing encounter
    # Expected error code FORBIDDEN - If a caregiver which is not mapped to that current patient tries to access that patient
    # Expected error code BAD_USER_INPUT - if error on adding patient to session
    # Expected error code FORBIDDEN - if user is not authorized
    patient(patientId: ID, externalId: ID): Patient @grant(roles: [ApprovedUser])
 
    # Used to search for an encounter by patient external ID. 3 possible states: 
    # 1) no active encounter found in our system and no patient in the SDC CDR (returns null), 
    # 2) patient found in the SDC CDR, but no active encounter in our system (returns Patient),
    # 3) active encounter found in our system (returns Patient)
    # Returns patient info
    # Expected error code VALIDATION_ERROR - if an invalid external id type is used for the current tenant
    # Expected error code VALIDATION_ERROR - if an invalid external id type is used
    # Expected error code FORBIDDEN - if user is not authorized
    findPatientInformation(bearerToken: String!, externalId: ID!, externalIdType: String!): PatientOrCdrSkeleton @grant(roles: [ApprovedUser])
   
    # Find all locations
    # Expected error code FORBIDDEN - if user is not authorized
    locations: [Location]! @grant(roles: [ApprovedUser, Administrator])
    
    # Request an authentication challenge phrase for a FamilyMember
    # Expected error code of UNAUTHORIZED - no family member is found
    authenticationChallenge(userId: ID!): String
    
    # Request a registration challenge phrase for a FamilyMember
    # Expected error code UNAUTHORIZED - if there are no entries in redis
    # Expected error code UNAUTHORIZED - if a family member already exists
    registrationChallenge(invitationToken: ID!): RegistrationChallenge
   
    # List of possible patient relationships available to FamilyMembers during enrollment
    patientRelationships : [String]
    
    # List of all quick messages for the current user and the location associated with the patient
    # Expected error code NOT_FOUND - if location not found for patient
    # Expected error code FORBIDDEN - if user is not authorized
    quickMessagesByPatient(patientId: ID!) : [LocationQuickMessage] @grant(roles: [ApprovedUser])
    
    # List of location quick messages for a location Id
    # Expected error code FORBIDDEN - if user is not authorized
    locationQuickMessages(locationId: ID): [LocationQuickMessage] @grant(roles: [Administrator])
    
    # List of possible locales available for selection during FamilyMember enrollment
    locales: [Locale]
    
    # List of possible external ID types available to all customers
    externalIdTypesList: [ExternalIdType]!
    
    # List all settings per tenant
    # Expected error code FORBIDDEN - if user is not authorized
    tenantSettings : [TenantSetting]! @grant(roles: [Administrator, ApprovedUser, FamilyMember])
    
    # Find the configuration associated with a Location
    # Expected error code FORBIDDEN - if user is not authorized
    locationSettings(locationId: ID!) : [LocationSetting]! @grant(roles: [Administrator, ApprovedUser])
    
    # List all of the created and retained audit report jobs associated with the tenant
    # Expected error code FORBIDDEN - if user is not authorized
    auditReportJobs : [AuditReportJob] @grant(roles: [Administrator]) 
    
    # List all of the created and retained audit report jobs associated with the tenant
    # Expected error code FORBIDDEN - if user is not authorized
    auditReportResources(id: ID!) : [String] @grant(roles: [Administrator]) 
    
    # List user information based of current session
    # Expected error code FORBIDDEN - if user is not authorized
    user : User @grant(roles: [ApprovedUser, FamilyMember])
    
    # List all location fixed contents for a location Id
    # Expected error code FORBIDDEN - if user is not authorized
    locationFixedContents(locationId: ID) : [LocationFixedContent] @grant(roles: [Administrator])
    
    # List all fixed contents for a location Id and site wide
    # Expected error code FORBIDDEN - if user is not authorized
    fixedContents(locationId: ID) : [LocationFixedContent] @grant(roles: [ApprovedUser, FamilyMember])

    # Used to retrieve initial patient list state, should return only minimal information
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    # Expected error code NOT_FOUND - if the patients or users in the chat are not found
    initialHistory: InitialHistoryPayload @grant(roles: [ApprovedUser, FamilyMember])  @csa_integration
    
    # Used to retrieve chat messages for a patient.
    # Cursor can be retrieved from the initial history request and used for pagination
    # When subsequent requests are made, the query will return the next X messages 
    # AFTER the provided cursor (so excluding the message provided as cursor)
    # The next cursor can be retrieved from the ConnectionEdge type
    # The messages are ordered descending by the order number and there is no way to 
    # customise this on the chat service right now
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users, caregiver not assigned to patient)
    # Expected error code NOT_FOUND - if patient does not have any on-going encounters or an open chat channel
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    # Expected error code VALIDATION_ERROR
    chatHistory(patientId: ID!, limit: Int!, cursor: String): ChatHistoryPayload @grant(roles: [ApprovedUser, FamilyMember])  @csa_integration

    # Get paginated active members list
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    # Expected error code NOT_FOUND - if patient does not have any on-going encounters or an open chat channel
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    chatMembers(patientId: ID!, limit: Int!, offset: Int!): ChatMemberConnection @grant(roles: [ApprovedUser, FamilyMember])  @csa_integration
    
    # Get initial state for chat channel per patient
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    # Expected error code NOT_FOUND - there are no active encounters for that patient or patient does not exist
    patientChatChannel(patientId: ID!): PatientChatChannel @grant(roles: [ApprovedUser])  @csa_integration
    
    # Get WS URL for user and device
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    getWebSocketUrl: WebSocketUrlResponse! @grant(roles: [ApprovedUser, FamilyMember]) @csa_integration @version(version: "2.0.0")
}

type Mutation {
    # Save necessary info to send a push notification
    # Expected error code NOT_FOUND - if device is not found
    # Expected error code FORBIDDEN - if user is not authorized
    updatePushNotificationsConfig(config: PushNotificationsInfoInput): DeviceInfo @grant(roles: [FamilyMember, ApprovedUser])
    
    # Used to enroll a new patient into the system
    # Expected error code NOT_UNIQUE - if patient has an ongoing encounter
    # Expected error code FORBIDDEN - if an administrator tries to enroll a patient
    # Expected error code NOT_FOUND - if no caregiver(s) tied to the patient and patient can not exist without a caregiver
    # Expected error code BAD_USER_INPUT - if no caregiver(s) tied to the patient and patient can not exist without a caregiver
    # Expected error code BAD_USER_INPUT - if error on adding patient to session
    # Expected error code FORBIDDEN - if user is not authorized
    enrollPatient(patient: EnrollPatientInput): Patient @grant(roles: [ApprovedUser])
    
    # Used to update an enrolled patient into the system
    # Expected error code FORBIDDEN - if encounter has ended
    # Expected error code FORBIDDEN - If a caregiver which is not mapped to that current patient tries to update that patient
    # Expected error code FORBIDDEN - if user is not authorized
    updatePatient(patient: UpdatePatientInput): Patient @grant(roles: [ApprovedUser])
    
    # Used to update an enrolled patient's details and encounter activity in the system
    # Expected error code FORBIDDEN - if encounter has ended
    # Expected error code FORBIDDEN - If a caregiver which is not mapped to that current patient tries to rescan that patient
    # Expected error code FORBIDDEN - if user is not authorized
    rescanPatient(patient: UpdatePatientInput) : Patient @grant(roles: [ApprovedUser])
    
    # Used to assign a Caregiver to a Patient
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code UNEXPECTED_ERROR - if db transaction fails
    # Expected error code BAD_USER_INPUT - if no caregiver(s) tied to the patient and patient can not exist without a caregiver
    # Expected error code BAD_USER_INPUT - if error on adding patient to session
    # Expected error code FORBIDDEN - if user is not authorized
    assignCaregiverToPatient(patientId: ID!, encounterId: ID!): Patient @grant(roles: [ApprovedUser])
    
    # Used to generate an invitation link for a FamilyMember
    # Returns invite url 
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code FORBIDDEN - If a caregiver or family member which is not mapped to that current patient tries to generate fm invitation
    # Expected error code FORBIDDEN - If a patient has allow_secondary set to false and a primary family members tries to invite new secondary family member
    # Expected error code UNEXPECTED_ERROR - if an error occurs while generating the invitation url
    # Expected error code BAD_USER_INPUT - if error on adding patient to session
    # Expected error code FORBIDDEN - if user is not authorized
    generateFamilyInvitationUrlByPatient(patientId: ID!) : String! @grant(roles: [ApprovedUser, FamilyMember])
    
    # Used to generate an invitation link via SMS for a FamilyMember
    # Returns ture or false based on SMS sent successfully or not
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code FORBIDDEN - If a caregiver or family member which is not mapped to that current patient tries to generate fm invitation
    # Expected error code FORBIDDEN - If a patient has allow_secondary set to false and a primary family members tries to invite new secondary family member
    # Expected error code BAD_USER_INPUT - if error on adding patient to session
    # Expected error code TOO_MANY_REQUESTS - if number of requests pass the rate limit within set amount of time
    # Expected error code FORBIDDEN - if user is not authorized
    generateFamilyInvitationSmsByPatient(patientId: ID!, phoneNumber: String!) : Boolean! @rate_limit(reqLimit: ${GENERATE_SMS_RATE_LIMIT}) @grant(roles: [ApprovedUser, FamilyMember])
    
    # Transmit the authentication details for a FamilyMember
    # Returns null when the family member cannot be found or signature is invalid on JWT
    # Expected error code UNAUTHORIZED - if there are no entries in redis 
    # Expected error code UNAUTHORIZED - if challenge string is not signed with correct key
    # Expected error code NOT_FOUND - if family member does not exist
    authenticationResponse(challengeStringSigned: String!, userId: ID!, device: DeviceInfoInput!): Session
    
    # Transmit the registration details for a FamilyMember.
    # Expected error code FORBIDDEN - if there are no entries in redis
    # Expected error code UNAUTHORIZED - if challenge string is not signed with correct key
    registrationResponse(invitationToken: ID!, challengeStringSigned: String!, publicKey: String!): String
    
    # Used to create or renew an admin application session with the Ohana server, existing
    # Session can be detected from the Authorization HTTP header value
    # Expected error code FORBIDDEN - user is not an Administrator or invalid JWT
    # Expected error code UNAUTHORIZED - if identity not found
    adminCreateOrRefreshSession(bearerToken: String!, tenantId: ID!) : Session
    
    # Used to create or renew an caregiver application session with the Ohana server, existing
    # Session can be detected from the Authorization HTTP header value
    # Expected error code INVALID_TENANT - for a bad site code
    # Expected error code FORBIDDEN - for an invalid token or role
    # Expected error code FORBIDDEN_TENANT - for an invalid role and tenant
    # Expected error code UNAUTHORIZED - if identity not found
    caregiverCreateOrRefreshSession(bearerToken: String!, tenantId: ID!, device: DeviceInfoInput!) : Session
    
    # Updates user information for FamilyMember and verifies the provided date of birth
    # against the Patient associated with the Encounter.
    # Expected error code NOT_FOUND - if family member does not exist or no patient found
    # Expected error code INVALID_FAMILY_TYPE - if a family member with this relationship to patient cannot be a secondary family member
    # Expected error code DUPLICATE_PATIENT_USER - if a family member mapped to this patient is already utilizing this relationship
    # Expected error code VALIDATION_ERROR - if patient dob does not match with what family member fills in
    # Expected error code UNEXPECTED_ERROR - if update fails
    # Expected error code FORBIDDEN - if user is not authorized
    finalizeFamilyMemberRegistration(familyMember: FinalizeFamilyMemberRegistrationInput) : FamilyMember @grant(roles: [FamilyMember])

    # Updates user information for an already registered FamilyMember. 
    # Expected error code FORBIDDEN - If family member has not finalised the registration process
    # Expected error code FORBIDDEN - If another family member is trying to update current family member
    # Expected error code FORBIDDEN - If a caregiver which is not assigned to the current patient tries to update the family member
    # Expected error code NOT_FOUND - if family member does not exist
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code INVALID_FAMILY_TYPE - if a family member with this relationship to patient cannot be a secondary family member
    # Expected error code DUPLICATE_PATIENT_USER - if a family member mapped to this patient is already utilizing this relationship
    # Expected error code UNEXPECTED_ERROR - if update family member fails
    # Expected error code FORBIDDEN - if user is not authorized
    updateFamilyMember(familyMember: UpdateFamilyMemberInput) : FamilyMember @grant(roles: [ApprovedUser, FamilyMember])

    # Removes family members from a Patient
    # Expected error code NOT_FOUND - if no family member is found
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code UNAUTHORIZED - if family member has no patient associated
    # Expected error code FORBIDDEN - if caregiver doesn't share a patient with family member
    # Expected error code FORBIDDEN - if user is not authorized
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    removeFamilyMember(userId: ID!) : Boolean @grant(roles: [ApprovedUser])
    
    # Creates a Location for a Tenant
    # Expected error code DB_ERROR - Location name already exists
    # Expected error code FORBIDDEN - if user is not authorized
    createLocation(location: CreateLocationInput): Location! @grant(roles: [Administrator])
    
    # Update metadata on a Location for a Tenant
    # Expected error code DB_ERROR - if location name already exists
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocation(location: UpdateLocationInput): Location @grant(roles: [Administrator])
    
    # Removes a Location from the system for a tenant.  Also removes the Location from the Patient, if associated
    # Expected error code FORBIDDEN - if user is not authorized
    removeLocation(id: ID!): Boolean @grant(roles: [Administrator])
    
    # Used to explicitly end a session
    # Expected error code FORBIDDEN - if user is not authorized
    endSession : Boolean! @grant(roles: [Administrator, ApprovedUser, FamilyMember])
    
    # Creates a pending Update for an Encounter
    # Expected error code FORBIDDEN - if encounter has ended
    # Expected error code FORBIDDEN - if a caregiver is not assigned to any encounter of given patient
    # Expected error code NOT_FOUND - if no patient is found in given encounter
    # Expected error code FORBIDDEN - if user is not authorized
    createUpdate(encounterId: ID!) : Update @grant(roles: [ApprovedUser])
    
    # Converts a Update to complete, removing it from its pending state
    # Rate limited using the 'fixed' algorithm with a request limit of ${TRANSLATION_RATE_LIMIT} and a expiration time of ${RATE_LIMIT_EXPIRATION_IN_SEC}s (applies only to free text updates)
    # Expected error code NOT_FOUND - if patient is not found
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code UNEXPECTED_ERROR - if db operation fails when creating an update
    # Expected error code FORBIDDEN - if user is not authorized
    commitUpdate(input: CommitUpdateInput) : Update @grant(roles: [ApprovedUser])
    
    # Deletes a pending Update and its attachments
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code FORBIDDEN - if user is not authorized
    rollbackUpdate(encounterId: ID!, updateId: ID!) : Boolean @grant(roles: [ApprovedUser])
    
    # Mark an update as read by a family member
    # Expected error code NOT_FOUND - if user is not found
    # Expected error code NOT_FOUND - if patient is not found
    # Expected error code NOT_FOUND - if update is not found or it has already been marked as read
    # Expected error code FORBIDDEN - if user is not authorized
    markUpdateAsRead(updateIds: [ID]) : [Update] @grant(roles: [FamilyMember, ApprovedUser]) 
    
    # Updates the quick messages associated with a Location. The order provided on the quickMessages argument is respected.
    # Expected error code DB_ERROR - if message does not exist
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocationQuickMessage(messageId: ID!, quickMessages: [LocalizedQuickMessageInput]!) : LocationQuickMessage @grant(roles: [Administrator])
    
    # Updates the quick messages order associated with a location
    # Expected error code DB_ERROR - if message ids mismatch
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocationQuickMessagesOrder(locationId: ID, quickMessagesOrder: [ID]!): [LocationQuickMessage] @grant(roles: [Administrator])
    
    # Creates the quick messages associated with a Location.
    # The order provided on the quickMessages argument is respected.
    # Expected error code BAD_USER_INPUT - if invalid location
    # Expected error code BAD_USER_INPUT - if number of quick messages exceeded
    # Expected error code FORBIDDEN - if user is not authorized
    createLocationQuickMessage(locationId: ID, quickMessages: [LocalizedQuickMessageInput]!): LocationQuickMessage @grant(roles: [Administrator])
    
    # Updates the quick messages associated with a User.  The order provided on the quickMessages argument is respected.  
    # currently NOT USED -
    # Expected error code FORBIDDEN - if user is not authorized
    updateUserQuickMessages(quickMessages: [String]!) : [String] @grant(roles: [ApprovedUser])
    
    # Deletes the quick messages associated with a message Id
    # Expected error code FORBIDDEN - if user is not authorized
    deleteLocationQuickMessage(messageId: ID!): Boolean @grant(roles: [Administrator])
    
    # Updates a setting associated with a tenant
    # Expected error code FORBIDDEN - if user is not authorized
    updateTenantSetting(input: TenantSettingInput) : TenantSetting @grant(roles: [Administrator])

    # Updates a specific key in configuration for a Location with the provided value
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocationSetting(input : UpdateLocationSettingInput) : LocationSetting @grant(roles: [Administrator])
    
    # Removes an attachment applied to a pending Update
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code NOT_FOUND - if attachment is not found
    # Expected error code FORBIDDEN - if user is not authorized
    removeAttachmentOnUpdate(input: RemoveAttachmentInput) : Boolean @grant(roles: [ApprovedUser])
    
    # Removes an attachment applied to a pending Update
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code NOT_FOUND - if attachment is not found
    # Expected error code FORBIDDEN - if user is not authorized
    removeMediaAttachmentOnUpdate(input: RemoveMediaAttachmentInput) : Boolean @grant(roles: [ApprovedUser])
  
    # Adds a quick message and its applicable translations (based on FamilyMembers in the Encounter) to the Update  
    # Expected error code NOT_FOUND - if quick message is not found or if no family member is found
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code FORBIDDEN - if user is not authorized
    addQuickMessageAttachmentOnUpdate(input: AddQuickMessageAttachmentOnUpdateInput) : UpdateQuickMessageAttachment @grant(roles: [ApprovedUser])
    
    # Create a request to generate an audit report for a window of time
    # Expected error code UNEXPECTED_ERROR - if failed while pushing message in service bus queue
    # Expected error code FORBIDDEN - if user is not authorized
    createAuditReport(input: CreateAuditReportInput) : AuditReportJob @grant(roles: [Administrator]) 
   
    # Cancels a request to generate an audit report
    # Expected error code NOT_FOUND - if audit report id not found
    # Expected error code FORBIDDEN - if user is not authorized
    cancelAuditReport(id: ID!): AuditReportJob @grant(roles: [Administrator])
   
    # User accepts or rejects EULA document
    # Expected error code BAD_USER_INPUT - if the session is invalid
    # Expected error code FORBIDDEN - if user is not authorized
    updateEULAAcceptanceStatus(acceptedEula: Boolean!): Boolean @grant(roles: [FamilyMember, ApprovedUser])
   
    # Adds a new location fixed content item to the system
    # Expected error code BAD_USER_INPUT - if the location is invalid
    # Expected error code BAD_USER_INPUT - if maximum number of fixed contents reached
    # Expected error code DB_ERROR - if something went wrong when creating a new fixed content
    # Expected error code FORBIDDEN - if user is not authorized
    createLocationFixedContent(locationId: ID, fixedContent: LocationFixedContentInput) : LocationFixedContent @grant(roles: [Administrator])
   
    # Updates a location fixed content item
    # Expected error code DB_ERROR - if incorrect fixed Content ID or tenant ID
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocationFixedContent(fixedContentId: ID!, fixedContent: LocationFixedContentInput) : LocationFixedContent @grant(roles: [Administrator])
    
    # Removes a location fixed content item
    # Expected error code DB_ERROR - if incorrect fixed Content ID or tenant ID
    # Expected error code FORBIDDEN - if user is not authorized
    removeLocationFixedContent(fixedContentId: ID!) : Boolean @grant(roles: [Administrator])
    
    # Reorders the location fixed content items
    # Expected error code DB_ERROR - if fixed content ids mismatch
    # Expected error code DB_ERROR - if incorrect fixed Content ID or tenant ID
    # Expected error code FORBIDDEN - if user is not authorized
    updateLocationFixedContentsOrder(locationId: ID, fixedContentsOrder: [ID]!) : [LocationFixedContent] @grant(roles: [Administrator])
    
    # Used to disassociate the assignment of a patient from a caregiver
    # Expected error code VALIDATION_ERROR - if encounter id or user id are invalid
    # Expected error code UNAUTHORIZED - if encounter has ended
    # Expected error code FORBIDDEN - If a caregiver is not mapped to that current patient
    # Expected error code FORBIDDEN - if user is not authorized
    # Expected error code UNSUPPORTED_VERSION_ERROR - if app is not the correct version number
    disassociatePatient(patientId: ID!) : Boolean! @grant(roles: [ApprovedUser])
    
    #Send a new chat message, we only support text messages ATM
    #Expected error code FORBIDDEN - the user is not authorized (i.e. admin users or user is not mapped to patient)
    #Expected error code NOT_FOUND - if the patient has no open encounters
    #Expected error code CSA_ERROR - something went wrong with the CSA communication
    #Expected error code VALIDATION_ERROR
    #Expected error code CHAT_DISABLED_ERROR - if chat is disabled on the patient or their location
    sendChatMessage(input: SendChatMessageInput!): ChatMessage @grant(roles: [ApprovedUser, FamilyMember])  @csa_integration
  
    # Caregivers can disable the Chat functionality per Patient
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    # Expected error code VALIDATION_ERROR
    toggleChatForPatient(input: ToggleChatForPatientInput!) : Boolean! @grant(roles: [ApprovedUser])  @csa_integration
    
    # Mark multiple messages as read by a user"
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
    # Expected error code CSA_ERROR - something went wrong with the CSA communication"
    # Expected error code VALIDATION_ERROR"
    markChatMessagesAsRead(input: MarkChatMessagesAsReadInput!): [ChatMessage] @grant(roles:[ApprovedUser, FamilyMember]) @csa_integration
    
    # Caregivers can mute/unmute the Chat notifications per Patient
    # Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
    # Expected error code CSA_ERROR - something went wrong with the CSA communication
    # Expected error code VALIDATION_ERROR
    changeNotificationLevelForPatient(input: ChangeNotificationLevelForPatientInput!): NotificationLevel @grant(roles:[ApprovedUser]) @csa_integration @version(version: "2.0.0")
}

input MarkChatMessagesAsReadInput {
    patientId: ID!
    orderNumbers: [Int!]
}

input SendChatMessageInput {
    patientId: ID!
    text: String!
    metadata: String!
}

# Expected error code BAD_USER_INPUT - for invalid window size values
input CreateAuditReportInput {
    # ISO-8601 compliant date
    startDate: String!
    
    # ISO-8601 compliant date
    endDate: String!
    includeMedia: Boolean 
}

input AddQuickMessageAttachmentOnUpdateInput {
   encounterId: ID!
   updateId: ID!
   quickMessageId: ID!
}

input RemoveAttachmentInput {
   encounterId: ID!
   updateId: ID!
   id: ID!
}

input RemoveMediaAttachmentInput {
   encounterId: ID!
   updateId: ID!
   filename: String!
}

input UpdateLocationSettingInput {
    locationId: ID!
    key: LocationSettingKey!
    value: String
}

input TenantSettingInput {
    key: TenantSettingKey!
    value: String!
}

type TenantSetting {
    key: TenantSettingKey
    value: String
}

type FreeTextTranslationMessage { 
    text: String! 
    locale: String!
}

# Represents a unidirectional form of communication between the Caregiver 
# and FamilyMember about the Patient.
type Update {
  id: ID
  text: String
  createdAt: String
  caregiver: Caregiver
  attachments: [UpdateAttachment]
  read: Boolean
  readReceipts: [ReadReceipt]
}

interface UpdateAttachment {
  id: ID
  type: UpdateAttachmentType!
}

type UpdateMediaAttachment implements UpdateAttachment {
  id: ID!
  type: UpdateAttachmentType!
  thumbUrl: String
  originalUrl: String
}

type UpdateQuickMessageAttachment implements UpdateAttachment {
   id: ID!
   type: UpdateAttachmentType!
   quickMessages: [LocalizedQuickMessage]!
}

type UpdateFreeTextTranslation implements UpdateAttachment {
   id: ID!
   type: UpdateAttachmentType!
   translations: [FreeTextTranslationMessage]!
}

type UpdateUserJoinAttachment implements UpdateAttachment {
   id: ID!
   type: UpdateAttachmentType!
   invitedByFirstName: String!
   invitedByLastName: String!
   invitedByUserType: String!
   inviteeName: String!
   inviteeRelationship: String!
}

type ReadReceipt {
   user: User
   timestamp: String
}

type RegistrationChallenge {
    challengeString: String 
    phoneNumber: String
}

input QuickMessageOrderInput{
    id: ID
    messageOrder: Int
}

input LocalizedQuickMessageInput{ 
    text: String! 
    locale: String!
}

input PushNotificationsInfoInput {
    deviceId: ID!
    deviceName: String
    deviceToken: String!
    partialKey: String! 
    notificationPlatform: NotificationPlatform!
}

input DeviceInfoInput{
    deviceId: ID!
    deviceName: String
    osVersion: String!
    deviceModel: String!
    appVersion: String!
}

type DeviceInfo {
    deviceId: ID!
    deviceName: String
    osVersion: String!
    deviceModel: String!    
    userId: ID!
    deviceToken: String
    iv: String
    notificationPlatform: NotificationPlatform
}

input ChangeNotificationLevelForPatientInput { 
  patientId: ID!
  notificationLevel: NotificationLevel!
 }

input CreateLocationInput {
    label: String!
}

input UpdateLocationInput{ 
    id: ID! 
    label: String!
}

input EnrollPatientInput {
   externalId: ID!
   firstName: String!
   lastName: String!
   dateOfBirth: String!
   location: ID!
   allowSecondaryFamilyMembers: Boolean
}

input UpdatePatientInput {
   id: ID!
   firstName: String!
   lastName: String!
   dateOfBirth: String!
   location: ID
   # Defaults to false
   allowSecondaryFamilyMembers: Boolean
   externalId: String
}

# Input used with the finalizeFamilyMemberRegistration mutation
input FinalizeFamilyMemberRegistrationInput {
  firstName: String!
  lastName: String!
  phoneNumber: String!
  patientRelationship: String!
  patientDateOfBirth: String!
  preferredLocale: String!
}

# Input used with the updateFamilyMember mutation
input UpdateFamilyMemberInput {
  userId: String!
  firstName: String!
  lastName: String!
  phoneNumber: String!
  patientRelationship: String!
  preferredLocale: String!
}

input CommitUpdateInput {
   encounterId: ID!, 
   updateId: ID!,
   # Error: BAD_USER_INPUT for over 1024 chars
   text: String
   type: String
}

input LocationFixedContentInput {
    title: String!
    url: String!
    color: String!
}

input ToggleChatForPatientInput {
  patientId: ID!
  chatPatientEnabled: Boolean!
}

type Patient { 
    id: ID,
    externalId: ID,
    externalIdType: String,
    firstName: String,
    lastName: String,
    dateOfBirth: String,
    location: Location
    lastEncounterId: ID
    updates: [Update]!
    familyMembers: [FamilyMember]!
    lastUpdatedAt: String
    allowSecondaryFamilyMembers: Boolean
    caregivers: [Caregiver]
    unreadUpdateCount: Int
}

type PatientCdrSkeleton {
  firstName: String,
  lastName: String,
  dateOfBirth: String
}

type Location {
  id: ID
  label: String
}

type ChatLocationEnabledUpdate {
    locationId: String!
    chatLocationEnabled: Boolean!
}

type NewChatMessageUpdate {
    patientId: ID!
    chat: ChatMessage!
    unreadChatMessageCount: Int
}

type ChatPatientEnabledUpdate {
  patientId: ID!
  chatPatientEnabled: Boolean!
}

type ReadChatMessageUpdate {
  patientId: ID!
  orderId: Int!
  unreadChatMessageCount: Int
}

type NotificationLevelUpdate {
  patientId: ID!
  notificationLevel: NotificationLevel
}

union ChatUpdate = ChatLocationEnabledUpdate | ChatPatientEnabledUpdate | NewChatMessageUpdate | NotificationLevelUpdate

type Subscription {
  """
  Expected bearer token in the headers so we can validate the user performing the request
  Expected error code UNAUTHENTICATED - the user is not authenticated
  Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
  Expected error code CSA_ERROR - something went wrong with the CSA communication
  Expected error code BAD_USER_INPUT - missing device information or user ID in the Redis session
  """
  watchChat: ChatUpdate
  
  """
  Expected bearer token in the headers so we can validate the user performing the request
  Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)
  Expected error code CSA_ERROR - something went wrong with the CSA communication
  """
  watchReadReceipts: ReadChatMessageUpdate
}
`;

const typeDefs = gql`
    ${schema}
`;

module.exports = {
    schema,
    typeDefs
};
