# Chat Membership

This document should track server specific changes for the Chat Membership of the 2-way communication feature in the
Voalte Family application.

## Introduction

We will talk about members being added/removed from the chat channel and also the channel lifecycle.

## Implementation

### Channel creation

The Ohana system is independent from the CSA, so a wipe in our internal environments will not mean a wipe on the CSA
database on the equivalent environment. To avoid having duplicated seeds for our patients, we will need a new column on
the `patients` table that will contain a ULID used for communicating with the Chat service when composing the seed for a
channel. The field could be called `patient_ulid` .

In the `fastify-api/graphql/chat/SendChatMessageResolver.js` we should create the chat channel if the patient does not
have a ULID generated, meaning it did not have a channel created for them yet. This operation is conditioned by having
the Chat feature enabled both at a patient and unit level.

The chat mutation will be saved under `shared/csa/graphql/CreateChannel.graphql` and should look like:

```graphql
mutation createChannel($input: CreateChannelInput!) {
    createChannel(input: $input) {
        channel {
            seed
        }
    }
}
```

Where the input will be generated based on the patient, FMs and CGs that will be added in the channel:

```json
{
    "input": {
        "seed": "vf:patient:<patient_ulid>",
        "members": [
            {
                "identity": "hrc:<ohana_product_oid>>:<cg1_user_id>",
                "metadata": "{\"1.3.6.1.4.1.50624.1.2.6\": {\"familyMember\": false}}"
            },
            {
                "identity": "hrc:<ohana_product_oid>>:<cg2_user_id>",
                "metadata": "{\"1.3.6.1.4.1.50624.1.2.6\": {\"familyMember\": false}}"
            },
            {
                "identity": "hrc:<ohana_product_oid>>:<fm1_user_id>",
                "metadata": "{\"1.3.6.1.4.1.50624.1.2.6\": {\"familyMember\": true}}"
            }
        ],
        "autoWatch": true,
        "openMembership": true,
        "individualReadReceipt": true
    }
}
```

### Channel deletion

Since the CSA has a very
long [retention period](https://hill-rom.atlassian.net/wiki/spaces/CSA/pages/4306272320/Initial+implementation), we want
to cleanup the channel data when a patient is unenrolled from Ohana.

We have the `azure-functions/autoUnenrollPatientsScheduledFunction.js` that will be triggered automatically for patients
that no longer have active encounters. When this happens, we want to be able to send multiple channel seeds to be marked
for deletion on CSA for the unenrolled patients that do have a `patient_ulid` field populated in the db.

To have a layer of authorization, we will save the channel creator user ID (this will always be a Caregiver user) on the
patients table and use it in the unenroll cron as the `X-User-Identity` header, while also getting the tenant specific
HTTP credentials to create the auth token for the request. The channel creator should be able to remove the channel even
if the user is no longer part of the members list.

The suggested API from CSA looks like this and will be saved in `shared/csa/graphql/DeleteChannel.graphql`:

```graphql
input DeleteChannelInput {
    seed: String!
}

type Mutation {
    """
    Cascading affect to chat_messages, chat_message_attachments, channel_membership
    and eventually member ( if user is not part of any other conv. )
    Authorization:
    The request will be authorized by the X-User-Identity header value, which should be
    the creator of the channel regardless of whether they are a member or not.
    """
    deleteChannel(input: DeleteChannelInput!): Boolean
}
```

The suggested implementation can be found up to date on
this [page](https://hill-rom.atlassian.net/wiki/spaces/CSA/pages/4228317227/Chat+Updates+to+Support+Voalte+Family+1.9+Review)
.

### Removing users

We want to soft-delete users in the Ohana system, so that we still have access to their information. On the CSA, we can
delete them permanently from a channel.
The trigger for this event will be in `fastify-api/graphql/family/RemoveFamilyMemberResolver.js` for FM
and `fastify-api/graphql/session/EndSessionResolver` and `azure-functions/cleanupCaregiverAssociatesSecheduledFunction`
for CG.

The CSA mutation will be saved under `shared/csa/graphql/RemoveMemberFromChannel.graphql`:

```graphql
mutation removeMemberFromChannel($input: RemoveMembersFromChannelInput!) {
    removeMembersFromChannel(input: $input) {
        membersRemoved
    }
}
```

And the corresponding input:

```json
{
    "input": {
        "seed": "<channel_seed>",
        "members": ["<member_identity>"]
    }
}
```

We also need to close the PubSub connection and remove the registered device from the group. This can be done on the
same server functions used for logging out or when the mobile app emits a `close` or `disconnect` event.
The logic for removing a device from PubSub should take place in the `AzurePubSubService` file mentioned in
the [server-mobile communication setup SDD](https://github.com/Hillrom-Enterprise/ohana-server/blob/develop/docs/2_way_communication/server_mobile_communication_setup.md)

### Adding users

In addition to adding the users when a channel is created, we can also add members at a later date. The format should be
the same as when adding them in the channel creation.

Changes are needed to the `fastify-api/graphql/AssignCaregiverToPatientResolver`
and `fastify-api/graphql/FinalizeFamilyMemberRegistrationResolver` to also send a request to the CSA before a success
response. We can create a function in `shared/chat/ChatCSADao` that will call the chat mutation.
The chat mutation will be saved under `shared/csa/graphql/AddMemberToChannel.graphql` and should look like:

```graphql
mutation addMembersToChannel($input: AddMembersToChannelInput!) {
    addMembersToChannel(input: $input) {
        membersAdded
    }
}
```

Where the input will be the new member, either FM or CG:

```json
{
    "input": {
        "seed": "vf:patient:<patient_ulid>",
        "members": [
            {
                "identity": "hrc:<ohana_product_oid>>:<cg2_user_id>",
                "metadata": "{\"1.3.6.1.4.1.50624.1.2.6\": {\"familyMember\": false}}"
            }
        ]
    }
}
```

In addition to the channel membership, a user logging into our app will register a new connection in PubSub. This should
be done per device, so that users logging in from multiple devices can still have an accurate chat messages state.
The logic for creating a new connection and registering it on PubSub should take place in the `AzurePubSubService` file
mentioned in
the [server-mobile communication setup SDD](https://github.com/Hillrom-Enterprise/ohana-server/blob/develop/docs/2_way_communication/server_mobile_communication_setup.md)

### Retrieving the member list for Mobile

We will create a new query field `chatMembers` which will return the active/familyMember members for a patient chat
channel.
CSA will sort the member list as it follows:

-   active members - those who sent messages
-   members with the `familyMember` property set to true in the metadata - all the FM users
-   other CG users who don't participate in the Chat, if they exist

The list will be retrieved from the chat service using a GQL query, parsed for user information from the Ohana system
and then forwarded to the Mobile app.

We will need a new resolver under `fastify-api/graphql/chat/ChatMembersResolver.js` that will handle the GQL query to
the CSA and user fetching based on the shared identities returned by chat for each user. We will initially use just PG
SQL queries to retrieve these users to avoid having the overhead of maintaining user details updates in a potential
Redis hash/set, but we can circle back to caching these results if the API performs poorly.
We can create a helper function in `shared/chat/ChatCSADao` that will call the chat query.

The chat query will be saved under `shared/csa/graphql/Members.graphql` and should look like:

```graphql
query members ($limit: Int, $offset: Int, $seed: String) {
    channelBySeed(seed: $seed) {
        members(limit: $limit, offset: $offset): MemberConnection
    }
}
```

The Ohana GQL query is similar:

```graphql
type ChatMemberConnection {
    edges: [ChatMemberConnectionEdge]!
    pageInfo: PageInfo!
}

type ChatMemberConnectionEdge {
    node: ChatMember!
    "will be null since we don't use cursor based pagination here"
    cursor: String
}

"Get paginated active members list"
chatMembers(patientId: ID!, limit: Int!, offset: Int!): ChatMemberConnection
```

The suggested implementation can be found up to date on
this [page](https://hill-rom.atlassian.net/wiki/spaces/CSA/pages/4228317227/Chat+Updates+to+Support+Voalte+Family+1.9+Review)
.
