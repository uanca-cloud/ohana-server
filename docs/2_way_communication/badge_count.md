# Badge Count for Two Way Communication

This document tracks the server changes required to implement into Voalte Family a badge count functionality for unread
update and chat messages.

### Overview

With the addition of chat messages available for both caregivers and family members, there is a need to highlight the
number of unread chat messages.

Badge count represents the total number of unread updates and chat messages. The number of unread messages and updates
is represented in multiple places in the mobile application (app badge count, cumulative unread updates and chat
messages for each patient in the caregiver’s patient list and split between the 2 message types - updates/chat messages)
.

### Configurations

No new configuration values are required.

### Implementation

-   `Schema` file needs to be updated to add a new mutation for marking multiple chat messages as read and the mutation to
    mark updates as read will be updated to allow calls made by Caregivers. A new `unreadUpdateCount` property will be
    added on the `Patient` type and `unreadChatMessageCount` will be added on the `NewMessageUpdate`
    and `ReadMessagesUpdate` events and on the `PatientChatChannel` type.

```
type ReadMessagesUpdate {
  patientId: ID
  chats: [ChatMessage]
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
    unreadUpdateCount: Int // NEW: needed for tracking unread updates
    familyMembers: [FamilyMember]!
    lastUpdatedAt: String
    allowSecondaryFamilyMembers: Boolean
    caregivers: [Caregiver]
}

type PatientChatChannel {
    patientId: ID!
	patientUuid: ID!
	unreadChatMessageCount: Int
	chatEnabled: Boolean // from admin location settings
	chatPatientEnabled: Boolean // on patient level
	notificationLevel: NotificationLevel
	lastChat: ChatMessage
}

type NewMessageUpdate {
	patientUuid: ID!
	chat: ChatMessage!
	unreadChatMessageCount: Int
}

type ReadMessagesUpdate {
	patientUuid: ID!
	chats: [ChatMessage]!
	unreadChatMessageCount: Int
}

type Query {
    "Used to retrieve initial patient list state, should return only minimal information"
	"Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
	"Expected error code CSA_ERROR - something went wrong with the CSA communication"
	initialHistory: InitialHistoryPayload @grant(ApprovedUser, FamilyMember)
}

type Mutation {
  "Mutation used to mark a series of messages from a chat - identified by patient id as read."
  # Expected error code FORBIDDEN - If user is not authorized to perform the action
  # Expected error code NOT_FOUND - If a message cannot be found
  # Expected error code CSA_ERROR - If an unexpected error occurs on the CSA integration
  markChatMessagesAsRead(readMessagesUpdate: ReadMessagesUpdate): [ChatMessage] @grant(roles: [FamilyMember, ApprovedUser])

  # Mark an update as read by a family member
  # Expected error code NOT_FOUND - if user is not found
  # Expected error code NOT_FOUND - if patient is not found
  # Expected error code NOT_FOUND - if update is not found or it has already been marked as read
  # Expected error code FORBIDDEN - if user is not authorized
  markUpdateAsRead(updateIds: [ID]) : [Update] @grant(roles: [FamilyMember, ApprovedUser])
}
```

-   A migration will be added to create the `updates_read_receipts` table and move all existing read receipt data from the
    `updates` table into this new format.
-   A `ReadReceiptDao` file will be added in the `shared` folder to handle all operations on the `update_read_receipts`
    table. Data will be inserted in bulk here since multiple updates are marked as read at the same time from the mobile
    side.
-   The `UpdatesHelper`, `UpdatesDao` and `AttachmentsDao` files will be updated to get all read receipts related
    information from the
    `update_read_receipts` table instead of the `updates` table.
-   The `MarkUpdateAsReadResolver` resolver will be updated to take into consideration Caregiver users as well. When
    retrieving a user's data from the database it should no longer call `getFamilyMember` function but one that returns
    data for Caregivers and Family Members, like `getUserByUserId`. The audit event should be registered only if the user
    marking the updates is a Family Member.
-   When computing the attachments for the read updates the `preferredLocale` for Caregivers should be considered English.
-   When returning the list of read receipts for an update on `patient` or `findPatientInformation` queries the list
    should only contain Family Member users, all Caregivers should not be taken into account.
-   `UnreadChatMessageCount` will be computed on the server side. It will be stored in redis as part of
    the `latest_sessions`
    collection for each user in the following format:

```json
  {
  "sessionIds": [],
  "role": "",
  "chatCounts": {
    patientUuid: unreadChatMessageCount
  }
}
```

-   When the information for `initialHistory` query is retrieved from CSA, the initial value for `unreadChatMessageCount`
    will be retrieved as well and added to redis in the collection mentioned above for each user and then sent as part of
    each
    `PatientChatChannel` to the mobile client.
-   When a new message event is received over the RabbitMQ queue from CSA, the `unreadChatMessageCount` value in redis for
    that user for that specific chat channel should be increased. After the value is updated the new unread count value
    needs to be sent to the mobile client in the `NewMessageUpdate` event over the `watchChat` subscription.
-   A new resolver, `MarkChatMessagesAsReadResolver`, will be added to implement the functionality behind
    the `markUpdateAsRead`
    mutation. Read receipt logic for chat messages will be implemented on the CSA side, so this resolver will send a
    graphql request to CSA to update the message status on their side. If the request is successful a new audit
    event, `chat_message_read`
    will be added in the `audit_events` table on the server side and a `ReadMessagesUpdate` event will be broadcasted
    through the `watchChat` subscription to all user's devices containing the updated unread count value so that the badge
    count can be updated on all devices belonging to a user. The `unreadChatMessageCount` value will be updated in redis
    as well, for each user.
-   The following error code need to be implemented for the `markChatMessagesAsRead` mutation:
    `FORBIDDEN` - if user is not authorised to perform this action;
    `NOT_FOUND` - if a chat message cannot be found or if it has already been marked as read;
    `CSA_ERROR` - generic error, should not be displayed to the user, but it exists to know that something failed on the
    CSA server;
-   A new schema validation file `MarkChatMessagesAsReadSchemaValidation` will be added to validate the input data sent to
    the server on this mutation.
-   A new file called `ChatCSADao` will be added in the `shared` folder to hold all operations related to chat feature
    integrations that require a request being sent to the CSA to store/gather information. This file will make use of the
    `CsaHttpGateway`'s `makeCsaHttpRequest` function when sending any request to CSA.
-   Unread counts for updates, `unreadUpdateCount`, will be calculated on the Ohana server side through a function added
    in the `UpdatesDao` file. This function will perform an PGSQL query on the database to obtain the number of unread
    updates for a certain user per patient. The `unreadUpdateCount` value will be sent to the mobile client on
    the `patients` query, as part of the `Patient` object.
-   On every new notification sent to the mobile client, the app badge value will be sent, containing the computed value
    for all unread chat messages and updates for that user. This value will be sent for iOS devices in the notification
    payload object in the `aps.badge` key. To obtain this value, on the server side we will sum
    the `totalUnreadUpdateCount` value obtained using a PGSQL query on the database to retrieve the count of all unread
    updates for a user, and the
    `totalUnreadChatMessages` value obtained by summing all unread counts from redis for that user.
-   When a Family Member is removed from the application or the patient is un-enrolled the notification sent to all Family
    Members should contain the badge count value of 0 so that the mobile application can clear out all application badges.
