# Server Track Specific Documentation for Post Acute Care

This document tracks server changes required to support long-term caregivers and post-acute care in Voalte Family.

## Introduction

This feature aims to support long-term caregivers with an additional role called `Long Term Approved User`. This role will effectively persist a caregiver's patient list, allow for manual disassociation, and dissociate a `Long Term Approved User` caregiver from a patient when they haven't interacted by the allotted period. This time value will be set in the Azure Function configuration and called `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS`.

## New Long-Term Approved User Role + Support a User with Multiple roles.

### Overview

The new role, ' Long Term Approved User`(LTAU), will be added by ECP/DHP to support long-term caregivers. The role will be pre-assigned to each user in Azure Active Directory. As a user Authenticates with Ohana through our login process, the`CaregiverCreateOrRefreshSessionResolver`function will be called, which is where the role(s) that come assigned to a user will be parsed with the`fetchCaregiverTenantIdentifier` function.

Part of the change needed for the new LTAU role is to allow users to have the option to have more than one role. It will be possible for a Caregiver to have both `Long Term Approved User` and `Approved User` assigned to them. We want the ability for a user to have multiple roles for tracking and to support an increased variety of user authorization.

**Note**, a user may contain both roles, such as `Long Term Approved User` and `Approved User`, or they may only have one of either role, such as `Long Term Approved User` or `Approved User`.

### Integration

With the addition to the `Long Term Approved User` (LTAU) role, Caregiver users will also have the ability to have `Approved User`. The Server will now need to support multiple roles for users.

The following software will need to be updated to integrate with a user role being stored in an array on the Database:

-   A Database migration, `users` Table so a user can store an array of roles instead of a singular role.
-   Schema changes for the additional role to be added to the Roles enum and updating the grants array on the Queries and Mutations.
-   Redis will store only one role for a user under `sessions` and `latest_sessions`, but on `sessions` and `latest_sessions` creation, new logic will need to support inserting the correct role for the user from the roles array.

#### Database

As a user can have multiple roles, the following changes will need to be implemented:

-   A database migration to change the `role` column **name** and **type** in the `users` Table.
    -   The name change will be from `role` to `roles`.
    -   The type change will be from text to array.
-   Due to the column name and type changes, a temporary users table must also be added to support backward compatibility and maintain existing users' data.
-   A script must be written to migrate the users' data and run during deployment.

#### Services and DAO Changes

-   The `fetchCaregiverTenantIdentifier` function within the `ZenithService.js` script will need to check if `Long Term Approved User` and `Approved User` exist.
    -   Such as : `hasZenithLongTermCaregiverRole = jwtMetadata.scopes.roles.includes(LONGTERMCAREGIVER);`
    -   A caregiver may have one or both of these roles. We will still need to check if the roles exist on the user to confirm they are a valid user.
-   For inserting the user into the Database, the `upsertUser` function in the UserDao.js script will need to pass the array of roles here.
    -   **Note**, the type must still be an array even if a user only contains one role.
-   The following functions will need to adjust how the role is being fetched or passed in `UserDao.js`:
    -   `getCaregiversByPatientId`
    -   `getFamilyMembersByPatientId`
    -   `upsertUser`
    -   `getCaregiverByUserId`
    -   `createFamilyMemberUser`
    -   `getFamilyMemberDevices`
    -   `getFamilyMemberDevicesByPatientIds`
    -   `getUserByUserId`
-   The following functions will need to adjust how the role is being fetched or passed in `FamilyIdentityDao.js`:
    -   `getFamilyMemberIdentity`
    -   `getFamilyMember`
-   The following functions will need to adjust how the role is being fetched or passed in `ZennithService.js`:
    -   `fetchCaregiverTenantIdentifier`

#### Schema

This additional role must change how we use the `Role` enum and our Grant authorization system.

-   The new role of `LongTermApprovedUser` must be added to the `Role` enum.
-   To support having a hierarchy of `Role` types, we can use `Union Types` in our schema.

```graphql
enum Role {
    Administrator
    FamilyMember
    ApprovedUser
    LongTermApprovedUser
    CaregiverRoles
}

type ApprovedUserType {
    value: ApprovedUser
}

type LongTermApprovedUserType {
    value: LongTermApprovedUser
}

union CaregiverRoles = ApprovedUserType | LongTermApprovedUserType
```

The `CaregiverRoles` role will be needed to be added as a grant for every place that grant is declared for `ApprovedUser`. This will allow a user with either role type authorization over that query or mutation request.

```graphql
@grant(roles: [CaregiverRoles])
```

#### Redis

-   Redis will need additional functionality to add the user role from the user's array of roles. However, Redis will still only store one role per user session.
-   **Note**, the `Long Term Approved User` will always be selected from a user's array of `roles` even when other roles are listed.
-   The functions to update how the role is passed for Redis caches user information:
    -   `createSession`
    -   `createSessionTemplate`

#### Audit

As Audit events (`createAuditEvent`) pull a user's role from Redis, nothing here should change.

## LTAU Role, Persisting the Caregiver's Patient List

### Overview

For a caregiver with the `Approved User` role, their patients' list will be disassociated from them when their last session expires.

However, a caregiver with a `Long Term Approved User` role will not have their patient list disassociated from when their last session expires. Their relationship with each of their patients should continue until one of the following events occurs:

1. The Caregiver with a `Long Term Approved User` role manually disassociates a patient from themself.
2. The patient and the Caregiver with a `Long Term Approved User` role haven't interacted in the amount of time specified in the config value of `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS`.

After either of the events listed above, the mapped relationship between that Caregiver and patient should be removed.
_The functionality mentioned above will be explored in more detail below._

## Passing Caregiver Roles to Mobile

### Overview

The Server will also need to provide mobile with the role the Caregiver user has (either `Long Term Approved User` or `Approved User`). Currently, we are already doing this when the user is returned. \* **Note**, the `Long Term Approved User` will always be selected from a user's array of `roles` even when other roles are listed.

### Integration

The role will be returned to mobile with the user:

```graphql
interface User {
    id: ID
    tenant: Tenant
    role: Role
    firstName: String
    lastName: String
    acceptedEula: Boolean
    renewEula: Boolean
}
```

For the update, `role` will now return (for a caregiver) one of the following role types:

-   `Long Term Approved User`
-   `Approved User`

#### Backwards Compatability

When returning the Caregiver's role to mobile, the Server will need to check The header value of `x-ohana-version` and confirm it is 1.8 or greater to pass the `Long Term Approved User` role. If the version number is less than 1.8, only the `Approved User` will be returned to mobile for that user's role type.

## Patient Manual Disassociation by Caregivers

### Overview

This new mutation will be allowed by _any_ user with either role of `Long Term Approved User` or `Approved User` to disassociate a patient from themself manually. From a server perspective, the relationship between the Caregiver and the patient in the `users_patients_mapping` table will be removed.

### Integration

We will update the schema with the new mutation:

```graphql
type Mutation {
    # Used to disassociate the assignment of a patient from a caregiver
    # Expected error code NOT_FOUND - if the patient no longer exists
    # Expected error code FORBIDDEN - if an administrator or family member tries to disassociate a patient
    # Expected error code UNEXPECTED_ERROR
    disassociatePatientFromCaregiverResolver(patientId: ID!): Boolean!
        @grant(roles: [CaregiverRoles])
}
```

The new `disassociatePatientFromCaregiverResolver` script will be added to the .`/fastify-api/graphql/patient` directory, and the `removeUserPatientMapping` function can be leveraged here.

## CRON Job(s) Updates

### Overview

To support long-term caregivers, they must be able to maintain a patient list in the system for more extended periods. Due to this, the Cron job(s) that are scheduled to often check for patient inactivity to un-enroll them or to disassociate patients from caregivers whose `latest_sessions` has expired will need to process differently for caregivers who have the role of `Long Term Approved User`.

Also, a new Cron job will be required called `AutoDisassociatePatientScheduledFunction`. This will check the newly configured value `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS` to check when LTAU caregivers and patients should be disassociated due to inactivity.

In the `CleanupCaregiverAssociatesScheduledFunction` and `AutoUnenrollPatientScheduledFunction`, caregivers who have the `Long Term Approved User` role will need to be ignored.

### Configuration

A new configurable value will be added into Azure Functions through infrastructure as code. This value will be called `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS`. If the amount of time a Caregiver and patient do not interact interactive exceeds the value set in `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS`, then the patient and Caregivers will be disassociated from each other.

### Implementation

-   `CleanupCaregiverAssociatesScheduledFunction`
    -   This Cron job will only check for caregivers who have the 'Approved User' role.
    -   Logic check must happen within the `refreshSessionIndex` function to support this.
-   `AutoUnenrollPatientScheduledFunction`
    -   New logic will need to be added here to ignore all patients who have any mapping to a caregiver with the role of LTAU.
    -   This will ensure that **only a patient who has had _all_ their LTAU caregivers dissociated from them first** before they can be checked for auto-unenrolled based on their location settings.
-   `AutoDisassociatePatientScheduledFunction`
    -   This new Cron job must be written and stored in the `./azure-functions/autoDisassociatePatientScheduledFunction` directory.
    -   Here, the `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS` config value will be leveraged to check if the inactivity exceeds that value.
    -   This function should have a similar setup as to the `AutoUnenrollPatientScheduledFunction`
        -   A configurable variable must be added to trigger the function to run often.
        -   This will be set in the Azure Function Configuration and be called `DISASSOCIATE_PATIENT_CRON_SCHEDULE`.
    -   The value that will be compared to the `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS` will be the `update_at` column from the `encounters` Table.
    -   The `removeUserPatientMappingsByUserIds` function can be utilized here.
    -   When the patient is disassociated from their Caregiver here, the datetime will be inserted into the `update_at` column from the `encounters` Table.

## Load Tests

### Update Generating Fixtures for Load Tests in Ohana tools

When a caregiver user data is created, we will update how the json data produces a role. The update must change the role type from text to an array for the user fixture data to be used in our tests.

### LTAU Role Flag

The feature flag will be used to change the role type of the caregiver user fixture data generated. The flag will be a `boolean` called `isLongTermCaregiver`.

If `isLongTermCaregiver` is set to `true`, the Caregiver's role will be set to `Long Term Approved User` in the array. If it is set to `false`, the role will be `Approved User`.

### Load Tests to Run

To test how the Ohana server will perform with LTAU caregivers as compared to `Approved User` caregivers, we will use the following tests:

-   [Steady State](https://hill-rom.atlassian.net/wiki/spaces/OHANA/pages/3335782485/Steady+State) - This is a priority test to, and the aim is 10000 VUs
-   [Constant Iterations](https://hill-rom.atlassian.net/wiki/spaces/OHANA/pages/4244701221/OHS-618+--+Constant+Iterations) - This is a priority test to, and the aim is 730 VUs
-   [Simple Session](https://hill-rom.atlassian.net/wiki/spaces/OHANA/pages/3069739081/Simple+Session) - This is not a priority, a nice to have test. The aim would be 2500 VUs

This enhancement compares how the Ohana server will handle LTAU caregivers with a persistent list of patients in the Database.

-   Because the LTAU caregiver's patient list is dissociated at 90 days of inactivity or if the Caregiver manually dissociates each patient.
-   This is compared with the Approved User caregivers, whose patients are all dissociated when their last active session ends.

## Deployment Plan

-   New configuration value will be set in `azureFunction.tf `:
    -   `LONG_TERM_APPROVED_USER_DISASSOCIATION_PERIOD_IN_HOURS`
    -   `DISASSOCIATE_PATIENT_CRON_SCHEDULE`
-   Database migration script will need to be run during deployment.
