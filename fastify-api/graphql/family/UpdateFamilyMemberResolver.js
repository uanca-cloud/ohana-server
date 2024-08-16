const {
    updateFamilyMember,
    getFamilyMember,
    CONSTANTS: {
        AUDIT_EVENTS: {FAMILY_INFO_EDITED},
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER}
    },
    UnauthorizedError,
    NotFoundError,
    ForbiddenError,
    createFamilyMemberTemplate,
    createAuditEvent,
    getLogger,
    formatDeviceId,
    getPreferredLanguage,
    setUserData,
    getPatientById,
    sharesPatientsMapping,
    isPatient,
    DuplicatePatientUserError,
    InvalidFamilyTypeError,
    isPatientAndNotPrimary,
    isDuplicatePatient
} = require('ohana-shared');

async function UpdateFamilyMemberResolver(_parent, args, context) {
    const logger = getLogger('UpdateFamilyMemberResolver', context);
    const {
        tenantId,
        role,
        assignedRoles,
        firstName: performingUserFirstName,
        lastName: performingUserLastName,
        deviceId,
        deviceName,
        deviceModel,
        version,
        buildNumber,
        osVersion,
        email,
        title,
        userId: sessionUserId
    } = context;
    const {firstName, lastName, phoneNumber, patientRelationship, preferredLocale, userId} =
        args.familyMember;

    if (role === FAMILY_MEMBER && userId !== sessionUserId) {
        logger.error("Family member cannot update a different user's information");
        throw new ForbiddenError({message: "Cannot update a different family member's data"});
    }

    const familyMember = await getFamilyMember(userId);

    if (!familyMember) {
        logger.error('Family member not found');
        throw new NotFoundError({description: 'Family member not found'});
    }

    // check if family member registration process is completed
    const familyMetadataNotComplete = !familyMember.patientRelationship;
    if (familyMetadataNotComplete) {
        logger.error('Family member has not finished the registration process!');
        throw new ForbiddenError({
            message: 'Family member has not finished the registration process!'
        });
    }

    const patient = await getPatientById({id: familyMember.patientId, tenantId});
    if (!patient) {
        logger.error('Patient not found');
        throw new UnauthorizedError({description: 'Patient not found'});
    }

    if (
        assignedRoles.includes(CAREGIVER) &&
        !(await sharesPatientsMapping(sessionUserId, familyMember.userId, patient.id))
    ) {
        logger.error(
            "Cannot update a family member's data if you are not mapped to the same patient"
        );
        throw new ForbiddenError({
            message:
                "Cannot update a family members' data if you are not mapped to the same patient"
        });
    }

    if (isPatientAndNotPrimary(patientRelationship, familyMember.primary)) {
        logger.error(
            'A family member with this relationship to patient cannot be a secondary family member'
        );
        throw new InvalidFamilyTypeError(
            'A family member with this relationship to patient cannot be a secondary family member'
        );
    }

    if (await isDuplicatePatient(patientRelationship, patient.id, userId)) {
        logger.error('Family member with the relationship of patient has already been added');
        throw new DuplicatePatientUserError(
            'A family member mapped to this patient is already utilizing this relationship'
        );
    }

    const result = await updateFamilyMember({
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        preferredLocale,
        userId,
        primary: familyMember.primary,
        hasPatientRelationship: isPatient(patientRelationship)
    });
    if (!result) {
        logger.error('Update family member failed');
        throw new Error('Update family member failed');
    }

    await createAuditEvent({
        eventId: FAMILY_INFO_EDITED,
        tenantId,
        patientId: patient.id,
        performingUserEmail: assignedRoles.includes(CAREGIVER) ? email : null,
        userType: role,
        userDisplayName: assignedRoles.includes(CAREGIVER)
            ? `${performingUserLastName}, ${performingUserFirstName}`
            : `${familyMember.lastName} ${familyMember.firstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        familyDisplayName: `${lastName} ${firstName}`,
        familyRelation: patientRelationship,
        familyLanguage: getPreferredLanguage(preferredLocale),
        familyContactNumber: phoneNumber,
        locationId: patient?.location?.id,
        performingUserTitle: assignedRoles.includes(CAREGIVER) ? title : null,
        externalId: patient?.externalId
    });

    const user = createFamilyMemberTemplate({
        id: userId,
        tenant: {
            id: tenantId
        },
        role: familyMember.role,
        assignedRoles: familyMember.assignedRoles,
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        preferredLocale,
        primary: familyMember.primary,
        invitedBy: familyMember.invitedBy,
        createdAt: familyMember.createdAt ? familyMember.createdAt.toISOString() : null,
        acceptedEula: !!familyMember.acceptedEula,
        renewEula: !!familyMember.eulaAcceptTimestamp,
        isPatient: isPatient(patientRelationship)
    });
    // fire and forget to not impact the response time
    setUserData(userId, user);
    return user;
}

module.exports = UpdateFamilyMemberResolver;
