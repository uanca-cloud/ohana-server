# Chat View

This document should track server specific changes for the Chat View of the 2-way communication feature, as well as
prerequisites needed for its
implementation in the Voalte Family application.

## Introduction

The Chat View will display the message history and allow users to send new messages, as well as mark multiple messages
as read.
For this to work, we need to first get an initial state of the user in regards to the chat channels and unread messages
and updates,
as well as subscribe each user to the `watchChat` subscription to be updated through Websockets by various events that
would change their chat state.

## Implementation

### Initial History Request

We will create a new GQL query `initialHistory` that will be used to retrieve the initial state for the currently logged
in user.
The return type of this query will be:

```graphql
type InitialHistoryPayload {
    patientChatChannels: [PatientChatChannel]
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

type ChatMessage implements Node {
    id: ID!
    "BIGSERIAL, unique for each message regardless of channel it belongs to"
    order: Int
    "we use this for pagination"
    cursor: String
    text: String
    sentBy: ChatMember
    createdAt: Date
    "no read receipts timestamp atm, status will be either created or read"
    status: ChatMessageStatus
    "JSON object with custom info"
    metadata: String
}

type ChatMember {
    userId: String
    firstName: String
    lastName: String
    role: Role
    title: String
    patientRelationship: String
}

enum NotificationLevel {
    loud
    mute
}

enum ChatMessageStatus {
    created
    read
}

type Query {
    initialHistory: InitialHistoryPayload @grant(ApprovedUser, FamilyMember)
}
```

-   for each channel:
    -   `patientId` - numeric unique identifier, could not be unique on CSA internal envs if the Ohana DB and CSA DB are
        out of sync so we will use a ULID for the seed identifier
    -   `unreadChatMessageCount` - unread chat messages, provided by CSA (default to 0 if channel has not been created)
    -   `chatLocationEnabled` - the value set on location settings in admin
    -   `chatPatientEnabled` - the value that enables/disables the chat per patient
    -   `notificationLevel` - provided by CSA (default to 'loud' if channel has not been created)
    -   `lastChat` - default to null if channel has not been created
        -   `id` - provided by CSA
        -   `order` - provided by CSA
        -   `cursor` - provided by CSA, in the format `order:<order_no>`
        -   `text` - provided by CSA
        -   `createdAt` - provided by CSA
        -   `status` - provided by CSA
        -   `sentBy`
            -   `userId` - the chat service will use shared identities in the format: `hrc:<ohana_product_oid>:<user_id>`.
                We will extract the user id from this and get the other user information using `getUserByUserId`
            -   `firstName` - provided by Ohana
            -   `lastName` - provided by Ohana
            -   `role` - provided by Ohana

The GraphQL query sent to CSA to retrieve all the information for channels will be added in a new file
under `shared/csa/graphql/InitialHistory.graphql` and should look like:

```graphql
query channels($limit: Int) {
    channels(limit: $limit) {
        edges {
            node {
                seed
                chats {
                    edges {
                        node {
                            id
                            order
                            text
                            createdAt
                            status
                            sentBy {
                                identity
                            }
                            metadata
                        }
                        cursor
                    }
                    unreadCount
                }
                notificationLevel
            }
        }
    }
}
```

If we provide no limit and cursor properties for the `chats` field, it should return the last message so we can use it
as the cursor.
The channel `$limit` can be a high value like 50, we don't currently support paging for the patients list on the Ohana
channel, but if we will in the future this will be useful to us.
For each new graphql file added for the CSA communication, we need to also update the `csaQueries` constant
in `shared/csa/graphql/GraphQLFileHelper.js`
It's our job on the server side to manipulate data and transform the seeds, identities between the CSA format and the
Ohana format of using patient/user ids. The response should contain data for all patients associated with the current
user, in case where some of these patients do not yet have a channel it should still return the configuration information.

### Chat Availability Toggle

The chat feature can be toggled from 2 places: the admin portal on unit (location) level and from the CG app on each
patient.

For the location level toggle, we can use the existing `updateLocationSetting` mutation with the
key `chatLocationEnabled` and
value `true/false`.
For the patient level toggle, we'll add a new mutation, with the resolver
under `fastify-api/graphql/chat/ToogleChatForPatientInputResolver.js`:

```graphql
input ToggleChatForPatientInput {
    patientId: ID!
    chatPatientEnabled: Boolean!
}

"Caregivers can disable the Chat functionality per Patient"
"Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
"Expected error code CSA_ERROR - something went wrong with the CSA communication"
"Expected error code VALIDATION_ERROR"
toggleChatForPatient(input: ToggleChatForPatientInput!): Boolean @grant(ApprovedUser)
```

### Channel Creation

The channel creation will be discussed in detail in the `chat_membership.md` SDD.

### Sending a Chat message

The Mobile app will send us the message via GQL mutation, we'll decorate the request with the required data for CSA and
send a request to a mutation on their side.
After a successful response, the new message will also be sent via RMQ to the other channel members and we will need to
extract information about the users and devices we need to notify about the new message.

#### The GraphQL mutation

We will add a new mutation on the server, the resolver will be
under `fastify-api/graphql/chat/SendChatMessageResolver.js` and the GQL looks like:

```graphql
input SendChatMessageInput {
    patientId: ID!
    text: String!
    metadata: String!
}

"Send a new chat message, we only support text messages ATM"
"Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
"Expected error code CSA_ERROR - something went wrong with the CSA communication"
"Expected error code VALIDATION_ERROR"
sendChatMessage(input: SendChatMessageInput!): ChatMessage @grant(ApprovedUser, FamilyMember)
```

The corresponding chat mutation will be saved under `shared/csa/graphql/SendChat.graphql` and looks like:

```json
{
    "input": {
        "seed": "vf:patient:<patient_ulid>",
        "priority": "normal",
        "text": "<message_text_here>",
        "metadata": "{\"<product_oid>\": {\"mobileMessageId\": \"some_id_here\"}}"
    }
}
```

#### The RMQ consumer

We already have the connection between Ohana and CSA RMQ, so we're already listening for messages, but we don't have a
defined handler for our consumer.
We need to create a function under `shared/chat/NewMessageRabbitMQHandler.js` that will extract the received data from
the RMQ payload, and be able to send either Push Notifications
or publish new events on PubSub for the channel members other than the sender.
We will then alter the `handler` function in `shared/csa/DefaultSubscriptionHandler` to have a switch for the field
name, we'll only have one case at the moment,
for `watchChannel`, and pass the `message.payload` to the `NewMessageRabbitMQHandler` function.
For reference, this is how the message payload will look like on RMQ:

```json
{
    "data": {
        "watchChannel": {
            "tenantId": "00JL",
            "seed": "vf:patient:1",
            "senderId": "hrc:1.3.6.1.4.1.50624.1.2.6:8bd409a7-2a96-4b76-9263-abb8bc49eb99",
            "recipients": [
                {
                    "identity": "hrc:1.3.6.1.4.1.50624.1.2.2:0100a000-008b-c07e-482f-2840a290a89f868",
                    "notificationLevel": "loud"
                },
                {
                    "identity": "hrc:1.3.6.1.4.1.50624.1.2.2:0100a000-008b-c07e-482f-2840a290a89f869",
                    "notificationLevel": "loud"
                }
            ],
            "membersAdded": null,
            "chat": {
                "elements": null,
                "text": "test dummy",
                "order": 1,
                "priority": "normal",
                "createdAt": "2023-11-15T09:02:34.819Z",
                "attachments": [],
                "status": "created",
                "id": "62cbb58c-5247-472f-8e19-43614b332ff2",
                "metadata": null
            },
            "channelMetadata": null,
            "channelCreatedAt": "2023-11-15T09:02:19.661Z"
        }
    }
}
```

### Retrieving the Chat messages for a patient

We need a new GQL query for this that supports cursor-based pagination. We'll add the resolver
under `fastify-api/graphql/chat/ChatHistoryResolver.js`

```graphql
"Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
"Expected error code CSA_ERROR - something went wrong with the CSA communication"
chatHistory(patientId: ID!, limit: Int!, cursor: String): ChatHistoryPayload  @grant(ApprovedUser, FamilyMember)
```

We will let the mobile app decide what the limit should be, but should be careful that the chat service has a maximum of
100 items that it can retrieve.
We will also need to make a request to the CSA for this, we'll add the GQL
under `shared/csa/graphql/ChatHistory.graphql` and it looks like:

```graphql
query channelBySeed($seed: String, $chatsAfter: String, $chatsFirst: Int) {
    channelBySeed(seed: $seed) {
        chats(after: $chatsAfter, first: $chatsFirst) {
            edges {
                node {
                    id
                    order
                    text
                    createdAt
                    status
                    sentBy {
                        identity
                    }
                    metadata
                }
                cursor
            }
            pageInfo {
                hasNextPage
                startCursor
                endCursor
                totalCount
            }
        }
    }
}
```

Where the input needs to be generated on the server side:

```json
{
  "seed": "vf:patient:<patient_ulid>",
  "chatsAfter": "<cursor>",
  "chatsFirst": <limit>
}
```

### Read receipts

We currently don't have an implementation for this on the CSA, but we have a proposal. We want the same functionality as
for updates, sending an array of items to be marked as read. This action should also trigger an subscription event to
change the status of the messages that were marked as read, we will receive from CSA a RMQ event for this. To enable
this kind of event update we need to subscribe to the `watchReadReceipts` subscription when the mobile client send us
the request to connect to our own subscription, and call `unwatchReadReceipts` when the client disconnects from our
PubSub.
The proposed mutation:

```graphql
input MarkChatMessagesAsReadInput {
    patientId: ID!
    orderNumbers: [Int!]
}

"Mark multiple messages as read by a user"
"Expected error code FORBIDDEN - the user is not authorized (i.e. admin users)"
"Expected error code CSA_ERROR - something went wrong with the CSA communication"
"Expected error code VALIDATION_ERROR"
markChatMessagesAsRead(input: MarkChatMessagesAsReadInput!): [ChatMessage] @grant(ApprovedUser, FamilyMember)
```

The CSA mutation should look the same as it does now, we can save it under `shared/csa/graphql/MarkChatsAsRead.graphql`:

```graphql
mutation markChatsAsRead($input: MarkChatsAsReadInput!) {
    markChatsAsRead(input: $input) {
        chats {
            order
        }
    }
}
```

Where the input should look like:

```json
{
  "input": {
    "seed": "<channel_seed>",
    "orderNumbers": [
      ...<order_numbers>
    ]
  }
}
```

## Additional work

### Error Handling

We'll create a new error under `shared/custom-errors` and use the code `CSA_ERROR` for it. We can forward the errors we
get from CSA by using this, but we'll need to be careful not to expose sensitive data.

### Audit

We need 2 new audit events:

-   an event for when a new message was sent
-   an event for messages that were read

We already have the pieces in place, we need to add new event ids in constants under `AUDIT_EVENTS`
for `CHAT_MESSAGE_SENT` and `CHAT_MESSAGES_READ`.
If we need to add the message text to the database, we can add two new columns: `message_id` and `message_content`

### Logging

We need to redact any sensitive data, so in addition to user and patient ids, we will need to also redact message text,
any seed and identity from CSA since they contain patient and user ids.
We can do it by adding additional values under the `REDACTED_KEYS` constant.

### Backwards Compatibility

The new pieces of code I'm talking about in this file should be wrapped in `if` clauses checking that the server version
is `gte(OHANA_VERSION_1_9_0)` and that `DISABLE_CSA_INTEGRATION` is false.

### Load Testing

We will need a new load test for interacting with the CSA endpoints. When running this load test, we’ll also not mock
the CSA HTTP or RMQ connections, so we need to coordinate with all the teams running tests against CSA Hotfix
environment.

A possible load test flow:

-   run the fixtures setup - this will ensure the tenant is registered with CSA and for each patient enrolled we have a
    channel

-   X no. of VUs login as caregivers and send messages to a random patient

-   Y no. of VUs login as FMs/secondary CGs

    -   retrieve the chat list

    -   mark new messages as read

    -   send a message

-   back to the first batch of VUs, they read the new messages

Unknowns:

-   how do we use the PubSub service on Hotfix? We’ll have no real client devices

-   determine the load test configuration - could be based on what estimates we have for number of users that will benefit
    from Ohana-CSA integration
