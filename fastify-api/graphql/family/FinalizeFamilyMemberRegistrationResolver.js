const {
        updateFamilyMember,
        getFamilyMember,
        getPatientsByUser,
        CONSTANTS: {
            AUDIT_EVENTS: {FAMILY_ENROLLED},
            FAMILY_MEMBER_TYPES: {PRIMARY, SECONDARY},
            MEDIA_TYPES: {USER_JOIN},
            DISABLE_CSA_INTEGRATION,
            OHANA_ROLES: {FAMILY_MEMBER}
        },
        formatDeviceId,
        createFamilyMemberTemplate,
        NotFoundError,
        ValidationError,
        createAuditEvent,
        getPreferredLanguage,
        createAttachment,
        createUpdate,
        setUserData,
        getLogger,
        isPatient,
        DuplicatePatientUserError,
        isDuplicatePatient,
        isPatientAndNotPrimary,
        InvalidFamilyTypeError,
        addChatMembers
    } = require('ohana-shared'),
    compareAsc = require('date-fns/compareAsc'),
    {v4: uuid} = require('uuid');

async function FinalizeFamilyMemberRegistrationResolver(_parent, args, context) {
    const logger = getLogger('FinalizeFamilyMemberRegistrationResolver', context);
    const {
        tenantId,
        tenantShortCode,
        role,
        userId,
        deviceId,
        deviceName,
        osVersion,
        deviceModel,
        version,
        buildNumber,
        assignedRoles
    } = context;
    const {
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        patientDateOfBirth,
        preferredLocale
    } = args.familyMember;
    const familyMember = await getFamilyMember(userId);
    if (!familyMember) {
        logger.error('Family member not found');
        throw new NotFoundError({description: 'Family member not found'});
    }

    const patients = await getPatientsByUser({userId, tenantId});
    if (!patients.length) {
        logger.error('Patient not found');
        throw new NotFoundError({description: 'Patient not found'});
    }

    const patientId = patients[0].id;
    const patientUlid = patients[0].patientUlid;
    const locationId = patients[0]?.location?.id;
    const encounterId = patients[0].encounterId;
    const metadata = {...logger.bindings()?.metadata, patientId, locationId, encounterId};

    if (isPatientAndNotPrimary(patientRelationship, familyMember.primary)) {
        logger.error(
            'A family member with this relationship to patient cannot be a secondary family member'
        );
        throw new InvalidFamilyTypeError(
            'A family member with this relationship to patient cannot be a secondary family member'
        );
    }

    if (await isDuplicatePatient(patientRelationship, patientId, userId)) {
        logger.error('Family member with the relationship of patient has already been added');
        throw new DuplicatePatientUserError(
            'A family member mapped to this patient is already utilizing this relationship'
        );
    }

    const dobComparison = compareAsc(
        new Date(patients[0].dateOfBirth),
        new Date(patientDateOfBirth)
    );
    if (dobComparison !== 0) {
        logger.error({metadata}, 'Patient Date of Birth is incorrect');
        throw new ValidationError({description: 'Patient Date of Birth is incorrect'});
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

    if (patientUlid && !DISABLE_CSA_INTEGRATION) {
        await addChatMembers(patientUlid, tenantShortCode, [{id: userId, FAMILY_MEMBER}]);
    }

    if (!result) {
        logger.error({metadata}, 'Finalize family member registration failed');
        throw new Error('Finalize family member registration failed');
    }

    const updateId = uuid();
    await createUpdate({userId, encounterId, patientId, updateId, text: ''});

    await createAttachment({
        id: uuid(),
        updateId,
        patientId,
        encounterId,
        metadata: {
            inviteeName: firstName + ' ' + lastName,
            inviteeRelationship: patientRelationship,
            invitedByFirstName: familyMember.invitedBy.firstName,
            invitedByLastName: familyMember.invitedBy.lastName,
            invitedByUserType: familyMember.invitedBy.role
        },
        type: USER_JOIN
    });

    await createAuditEvent({
        tenantId,
        eventId: FAMILY_ENROLLED,
        patientId,
        userType: role,
        userDisplayName: `${lastName} ${firstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        osVersion,
        deviceModel,
        version,
        buildNumber,
        familyDisplayName: `${lastName} ${firstName}`,
        familyRelation: patientRelationship,
        familyLanguage: getPreferredLanguage(preferredLocale),
        familyContactNumber: phoneNumber,
        familyMemberType: familyMember.primary ? PRIMARY : SECONDARY,
        locationId,
        externalId: patients[0]?.externalId
    });

    const user = createFamilyMemberTemplate({
        id: userId,
        tenant: {
            id: tenantId
        },
        role,
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        preferredLocale,
        primary: !!familyMember.primary,
        invitedBy: familyMember.invitedBy,
        createdAt: familyMember.createdAt ? familyMember.createdAt.toISOString() : null,
        acceptedEula: !!familyMember.acceptedEula,
        renewEula: !!familyMember.eulaAcceptTimestamp,
        isPatient: isPatient(patientRelationship),
        assignedRoles
    });
    // fire and forget to not impact the response time
    setUserData(userId, user);
    return user;
}

module.exports = FinalizeFamilyMemberRegistrationResolver;
