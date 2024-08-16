# Patient as a user

This document should track server specific changes required to implement patient as a user feature in Voalte Family application.

### Overview

The reason behind adding this feature to the Voalte Family application is to give the Patient the opportunity to login into the application and manage the list of Family Members that can see information about him/her as well as to be able to view the updates sent by the Caregiver about their own wellbeing.

### Configurations

`FAMILY_RELATION_WITH_PATIENT` - configuration value needs to be added to the terraform infrastructure code for the AppService Configuration. It will contain all the new `self/patient` family member relationship.

### Implementation

-   The `FamilyMember` type on the schema should be updated to contain the new flag `isPatient` used for marking a user as a patient. The new property should be versioned, and only available for clients with version greater or equal to 1.8:

    ```
      type FamilyMember implements User {
        ...
        isPatient: Boolean @version(version: "1.8.0")
      }
    ```

-   The following two mutations need to be updated on the schema file, so that the two new error types they throw are listed in the schema:

```
# Updates user information for FamilyMember and verifies the provided date of birth
# against the Patient associated with the Encounter.
# Expected error code NOT_FOUND - if family member does not exist or no patient found
# Expected error code UNEXPECTED_ERROR - if update fails
# Expected error code VALIDATION_ERROR - if patient dob does not match with what family member fills in
# Expected error code DUPLICATE_PATIENT_USER - if a user with the relationship to patient 'self/patient' is added on a patient where one already exists
# Expected error code INVALID_FAMILY_TYPE - if a user invited by another family member tries to register with the relationship to patient 'self/patient'
finalizeFamilyMemberRegistration(familyMember: FinalizeFamilyMemberRegistrationInput) : FamilyMember @grant(roles: [FamilyMember])

# Updates user information for an already registered FamilyMember.
# Expected error code FORBIDDEN - If family member has not finalised the registration process
# Expected error code FORBIDDEN - If another family member is trying to update current family member
# Expected error code FORBIDDEN - If a caregiver which is not assigned to the current patient tries to update the family member
# Expected error code NOT_FOUND - if family member does not exist
# Expected error code UNAUTHORIZED - if encounter has ended
# Expected error code DUPLICATE_PATIENT_USER - if a family member tries to change their relationship to patient from something else to 'self/patient' and  one already exists
# Expected error code INVALID_FAMILY_TYPE - if a secondary family member tries to update their profile with the relationship to patient 'self/patient'
updateFamilyMember(familyMember: UpdateFamilyMemberInput) : FamilyMember @grant(roles: [ApprovedUser, FamilyMember])
```

-   The `FAMILY_RELATION_WITH_PATIENT` configuration value present in the infrastructure code needs to be added:
    -   In the `sample.env` file for the local server configuration. It will need to be manually copied to the `.env` file on each developer’s local configuration from this `sample.env` file. The value for this configuration is the same as the one declared in terraform infrastructure.
    -   In the `constants.js` file, so that it can be further used in the application.
        -   `ConfigurationFunction.js` file needs to be updated to expose the `FAMILY_RELATION_WITH_PATIENT` value to the clients with a version greater or equal to 1.8:
            ```
            if (gte(version, OHANA_VERSION_1_8_0)) {
               result = {
                 ...result,
                familyRelationWithPatient: FAMILY_RELATION_WITH_PATIENT`
               };
            }
            ```
-   A new migration should be created to add the `is_patient` column to the `family_identities` table in the database. This column will have the type Boolean, it will be not nullable and the default value for it should be `false`.
-   The `EntitiesFactory` file should be updated, to add the new `isPatient` property to the `FamilyMember` and `FamilyMemberIdentity` types. Those will be used when a new Family Member object is constructed.
-   Functions returning `FamilyMember` or `FamilyMemberIdentity` types should be updated as follows:
    -   In `FamilyIdentityDao` file all getter functions returning a `FamilyMember` or `FamilyMemberIdentity` type should be updated to return the correct `isPatient` as well as the queries within them to extract this value from the database.
    -   In `UserDao` file all getter functions returning a `FamilyMember` or `FamilyMemberIdentity` type should be updated to return the correct `isPatient` value as well as the queries within them.
    -   The `UpdateFamilyMemberResolver` should be updated to return the `isPatient` property. This value should already be present in the `familyMember` object, since it is fetched using a function form the `FamilyIdentityDao` mentioned above.
    -   The `FinalizeFamilyMemberRegistrationResolver` should be updated to return the `isPatient` property. This value should already be present in the `familyMember` object, since it is fetched using a function from the `FamilyIdentityDao` mentioned above.
-   `FamilyRelationshipsResolver` needs to be updated to take into consideration the client version when returning the family relationships list. In order to make the patient relationship available only from 1.8 version onward, a check should be added so that if the client version is lower than 1.8 then the `FAMILY_RELATIONS` array will be returned, otherwise `FAMILY_RELATION_WITH_PATIENT` will be concatenated to the `FAMILY_RELATION` array and that value will be returned. Client version can be extracted from context, as it is available on every server request.
-   `FinalizeFamilyMemberRegistrationResolver` needs to be updated with the following:
    -   Before the family member with the `self/patient` role is added to the database a check should be added to see if a user with the `isPatient` flag set to `true` is already registered on that patient. If one already exists, a new error Duplicate Patient User should be thrown. For this check we should keep in mind that users, and especially family member ones, go through the soft-delete process when they’re removed from a patient, so the resource is not actually removed from the database unless all the encounters on that patient are closed. When searching for users with the `is_patient` flag set to `true` that are linked to a particular patient resource, the `deleted` column on the `users` table should also be checked. If the value is set to `true` than the error doesn’t need to be thrown since from the user perspective that family member does not exist anymore. This check should be made only if the client version is bigger than 1.8. We shouldn’t be encountering a situation where an older client selects this type of relationship, but for backwards-compatibility reasons a check for version should be added as well.
    -   When the `self/patient` relationship is selected and a new entry is added into the database, the `is_patient` column in the `family_identities` table should be set to `true`. This check should be done using the `FAMILY_RELATION_WITH_PATIENT` constant.
    -   When the `self/patient` relationship is selected the user is automatically registered as a primary family member in the database. This check should be done using the `FAMILY_RELATION_WITH_PATIENT` constant
-   `UpdateFamilyMemberResolver` file should be updated with the following:
    -   If a user that registered previously with the relationship to patient selected as `Self/Patient` changes the relationship value to something else, the `is_patient` column in the `family_identities` table is updated from `true` to `false` as well.
    -   If a user that registered previously with a different relationship to patient value selected tries to change their selection to `Self/Patient` and one user with the `is_patient` flag set to `true` already exists, a `DUPLICATE_PATIENT_USER` error should be thrown.
    -   If a secondary family member that registered previously with a different relationship to patient value selected tries to change their selection to `Self/Patient` then an `INVALID_FAMILY_TYPE` error should be thrown.
-   The `DuplicatePatientUserError` error should be defined as a custom error on the server side, having the error code `DUPLICATE_PATIENT_USER` and `‘A family member mapped to this patient is already utilizing this relationship’` in the `./shared/custom-errors` folder.
-   The `InvalidFamilyTypeError` error should be defined as a custom error on the server side, having the error code `INVALID_FAMILY_TYPE` and `‘A family member with this relationship to patient cannot be a secondary family member’` in the `./shared/custom-errors` folder.
-   The `AuthenticationResponseResolver` needs to be updated so that the `invitedBy` property is sent on the `User` object when the user is a Family Member. This value is already available in the resolver, as it is returned by the `getFamilyMember` function as part of the response, it just needs to be added to the `createSessionTemplate`, inside the `user` property for the mutation response.
-   The `resolver.js` file needs to be updated as well, to change the way the distinction is made between a `FamilyMember` user and a `Caregiver` one. At the moment this is made based on the `phoneNumber` property, which is not present in the `User` body for the `AuthenticationResponse` mutation response for example. In order to be able to send the appropriate response type for every user, this distinction should be made based on the `role` property.
