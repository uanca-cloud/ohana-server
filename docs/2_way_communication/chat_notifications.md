# Chat Notifications

This document should track server specific changes required to implement chat notifications in Voalte Family
application.

### Overview

The new notification system will support more quickly delivering notifications using Azure PubSub as well as supporting
caregiver and multi-device notifications

### Configurations

No configuration changes

### Implementation

-   To support caregiver and multi device notifications
    -   Create a new migration to add a text field named `registration_id` to the `device_info`
    -   In `schema.js` updatePushNotificationConfig add `ApprovedUser` to the list of allowed roles
    -   In `EntitiesFactor.js` DeviceInfo must be updated to include the new field registrationId
    -   In `UpdatePushNotificationConfigResolver.js`
        -   The `UpdatePushNotificationsConfigResolver` function must be updated
            -   To check if the current `deviceToken` is already registered in addition to just checking if a registration
                exists. Then same as existing logic we must call `createRegistrationId` to get a new `registrationId` to
                associate with the current device
            -   Pass the `registrationId` in the `updateDevicePushNotificationConfig` call
    -   In `DeviceInfoDao.js`
        -   The `updateDevicePushNotificationConfig` function must be updated to
            -   Receive `registrationId` and include it in the `updateQueryText` to assign `registration_id`
            -   Pass the `registrationId` to the `createDeviceInfoTemplate` call
        -   The `getDeviceInfo` function must be updated to
            -   Retrieve the `registration_id` in the `getDeviceInfoQuery`
            -   Pass `result.rows[0].registration_id` from the result to the `createDeviceInfoTemplate` call as
                the `registrationId` field
        -   Add a new function getDeviceInfoForUsers this function will accept an array of userIds and return the device
            info for each
    -   In `EndSessionResolver.js`
        -   The `EndSessionResolver` function we must call `deleteRegistration` with the
            current `deviceInfo.registrationId`
    -   In `CommitUpdateResolver.js`
        -   `CommitUpdateResolver` function we must retrieve the caregiver recipients with the exception of the current
            user and append those to the existing list of recipients this will be done by calling a new
            function `getCaregiverDevicesExcludeUserId`
    -   In `UserDao.js`
        -   The `getFamilyMemberDevices` function must be updated
            -   No results to return an empty array instead of null
            -   `queryText` needs to return `registration_id`
            -   When calling `createFamilyMemberTemplate` include the `registrationId`
        -   Add a new function `getCaregiverDevicesExcludeUserId` that accepts `patientId` `tenantId` and `userId` the
            function will retrieve matching devices except for the one associated with the provided `userId`
-   To support the addition of chat notifications
    -   In `constants.js` add a new value to `PUSH_NOTIFICATIONS_TYPES` with value of `CHAT`
-   To support the ability for caregivers to mute chats
    -   Create a new migration to add a field to `UsersPatientsMappings` a new field of `notificationLevel` which will be
        type text and hold either `mute` or `loud` and default to `mute`
    -   Create a new
        mutation `changeNotificationLevelForPatient(input: NotificationLevelUpdate!): NotificationLevel @grant(ApprovedUser)`
        -   The new type to support this
            is `type NotificationLevelUpdate { patientId: ID! notificationLevel: NotificationLevel }`
        -   `NotificationLevel` is an ENUM with possible values of "mute" or "loud"
        -   This endpoint will update the `UsersPatientsMappings` entry for the specified patientId and caregiverId of the
            authenticated user to have the new `notificationLevel` value
    -   In `AzureNotificationHubGateway.js`
        -   The `generatePushNotificationPayload` should be updated to
            -   Optionally accept the relevant `patientId` and `caregiverId`
            -   Check the `notificationLevel` for the patient-caregiver combination and if the value of `notificationLevel`
                is `"mute"` then
                -   Set `"content-available" : 1`
                -   The `alert` key should be omitted from the payload
-   To connect the system to Azure PubSub
    -   In `AzurePubSubClient`
        -   Add a new function `checkUserConnection` that will hit the Web Pub Sub - User Exists endpoint to see if there
            are any client connections for the given user
        -   When checking for events from the PubSub if the event is a new chat then
            call `AzureNotificationHubGateway.js` `sendPushNotification` to trigger a new notification
    -   In `AzureNotificationHubGateway.js`
        -   The `sendPushNotification` function should be updated to
            -   Call the `AzurePubSubClient` `checkUserConnection` function
                -   If connections exist then send the notification through the `AzurePubSubClient`
                -   If no connections exist maintain legacy behavior
