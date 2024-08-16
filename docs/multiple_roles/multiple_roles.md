# Multiple Roles Per User

This document tracks the server changes required to implement into Voalte Family multiple roles functionality for users with both Admin and Approved user roles from DHP.

## Background

This change intends to add multiple roles per user. Users can now track all relevant user roles from their DHP token to the Ohana system upon user authentication in the Voalte Family / Ohana applications.

Users will continue to only have access to specific functionality depending on how the user logged in /authenticated to Ohana / Voalte Family; however, this new approach standardizes how users with more than one role are supported in our application. By tracking all assigned roles per user, we can prevent bugs when a user switches between the Ohana admin website and the Ohana mobile applications and support additional roles that can be attached to a user in the future.

PoC work that was done to validate the best path forward for multiple roles can be found [here](https://hill-rom.atlassian.net/wiki/spaces/OHANA/pages/4405035031/Ohana+-+Users+having+multiple+roles+PoC).

## Overview

To implement tracking for multiple roles there will be a change in the database on the users table, updating the `roles` column to `assigned_roles`; this will be an array of strings. We will also add the value of the assigned role (array of strings) in Redis.

Although the role will no longer be tracked in the database (as this will be replaced by the `assigned_roles` column), `role` will continue to be referenced from Redis and user context. This is because `role`, through this change, has evolved to be a reference on how the user authenticated for that user's specific session.

### Configurations

No new configuration values are required.

### Implementation

#### Schema

The schema changes include exposing the `assignedRoles` in the `Caregiver` and `FamilyMember` `types`. The `assignedRoles` represent all roles a user has been given from their DHP token, and `role` is the singular role the user authenticated with. Currently, there are no functional changes on the admin website or mobile application where `assignedRoles` will need to be referenced (but could be required in the future as new roles are introduced).

```
interface User {
id: ID
tenant: Tenant
role: Role
assignedRoles: [Role] @version(version: "1.9.0")
firstName: String
lastName: String
acceptedEula: Boolean
renewEula: Boolean
}
type Caregiver implements User {
id: ID
tenant: Tenant
role: Role
assignedRoles: [Role] @version(version: "1.9.0")
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
assignedRoles: [Role] @version(version: "1.9.0")
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
```

#### Database

A new migration will be written to do the following steps:

1. Create a new column in the users table for assigned_roles.
2. Migrate all of the current user role strings to the assigned_roles column into the array of strings.
3. Drop the role column on the users table.

A temporary table will also be created for the users table to reference its state before this change. If the migration is successful, a new one-off migration can be run to delete the temporary users table.

#### Redis

The functionality for session creation on user login should continue as it is currently.
In the use case for a user with multiple assigned roles (Admin and Caregiver), there will continue to be two sessions after a user authenticates as an Admin user and a Caregiver user. The point to highlight is both sessions in Redis will reference the same user ID in the users table; there, we will see the assigned_roles column contains an array with both 'ApprovedUser' and 'Administrator'.

For each user's session, there will now be a key of `assignedRoles` with the value of a string of arrays containing all their assigned roles, for example, `assignedRoles: ['ApprovedUser']`. There will also continue to be a key of `role` with the value of a string representing the role the user logged in with.

#### Functionality Changes

Overall, the code base will check the assignedRoles and the role referenced through user context or Redis. Any SQL queries where a `role` column is checked against must be updated to check the `assgined_roles` column instead of the `role` column (which no longer exists). A list of these updated functions can be found in the Dao Functions section below.

##### Authenticating Logic Updated for Capturing Multiple Roles

New functionality will be added to the creating/refreshing session for Admin and Caregiver users. Within the Zenith Service, we will expand checking if just the role exists for the user authenticating by adding a new helper function `findUserRoles`. `findUserRoles` will loop through all the DHP roles assigned to that user's token and return all relevant Ohana roles to the user to be saved and referenced in the database. This new helper function will be used by both the `fetchAdminIdentity` and `fetchCaregiverTenantIdentifier` functions. In the Resolvers, to create or refresh the sessions for the caregiver and admin, we will need to alter the upsertUser Dao function, as columns such as Email are overwritten. There will now be two upsert user functions, `upsertCaregiverUser` and `upsertAdminUser`, to avoid overwriting any information a caregiver contains that an admin user does not.

##### Business Logic

Within the code's business logic, there are some areas where we will still need to check against the user's `role` over the `assignedRoles`. This is because the code logic being performed is tied to how that user was specifically authenticated when the session was created.

The following list contains logic that still references `role` over `assignedRoles`:

-   The `GrantDirective` will still utilize the role to see if it has the right to take specific actions. This will prevent an admin user with the `assignedRoles` of 'administrator' and 'approvedUser' from having access to actions that are only accessible to authenticated 'approvedUser' / caregiver users and vis versa when a user logs in as a Caregiver.
-   `EndSessionResolver,` here we need to know the specific role the user authenticated and created their session with; that way, we expire the session correctly.
-   `updateSession`, the Admin role will need to be ignored because the admin session is handled separately by the DHP, so we will need to reference the role type here.
-   `createSession`, role type is needed for tracking within the `RedisHashMap`.
-   `refreshSessionIndex`, role is needed here to confirm if a Caregiver has created the session; that way, if it has, we can appropriately push that session to the `caregiversToBeUnassociated` list.
-   `createAuditEvent`, `role` is used for `userType` in creating the audit report.
-   In enrolling a new family member, `assignedRoles` are unnecessary within the redis values used to track the invited family member's enrollment process, thus, the invited user's role will be still referenced with the role keyword.

##### Dao Functions

Many Dao functions will be updated to check if the user contains the authorizing role for a specific actions on the users table within the `assigned_roles` column.

Below is a list where updates were needed:

-   `selectAuditReportData`
-   `createFamilyMemberIdentity`
-   `getFamilyMemberIdentity`
-   `getFamilyMember`
-   `enrollPatient`
-   `addEncounterToPatient`
-   `getPatientsWithClosedEncounters`
-   `getUpdatesByPatientId`
-   `getUpdateByUpdateIds`
-   `getCaregiversByPatientId`
-   `getFamilyMembersByPatientId`
-   `upsertCaregiverUser`
-   `upsertAdminUser`
-   `getCaregiverByUserId`
-   `createFamilyMemberUser`
-   `getFamilyMemberDevices`
-   `getFamilyMemberDevicesByPatientIds`
-   `getUserByUserId`
-   `getCaregiversByPatientIdWithClosedEncounters`
