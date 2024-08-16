const {
        removeFamilyMember,
        getFamilyMember,
        CONSTANTS: {
            AUDIT_EVENTS: {FAMILY_UNENROLLED},
            PUSH_NOTIFICATIONS_TYPES: {REMOVE_FAMILY_MEMBER},
            PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL,
            PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL,
            FAMILY_APP_NAME,
            DISABLE_CSA_INTEGRATION
        },
        UnauthorizedError,
        NotFoundError,
        ForbiddenError,
        createAuditEvent,
        getDeviceInfoByUserId,
        getFamilyMemberDevices,
        getFamilyMembersByPatientId,
        createNotificationHub,
        sendPushNotification,
        generatePushNotificationPayload,
        getLogger,
        formatDeviceId,
        getPreferredLanguage,
        deleteSessionByUserId,
        deleteUserData,
        hasOpenEncounter,
        getPatientById,
        sharesPatientsMapping,
        removeUserAsChatMember,
        removeUsersAsChatMembers
    } = require('ohana-shared'),
    template = require('lodash.template');

async function RemoveFamilyMemberResolver(_parent, args, context) {
    const logger = getLogger('RemoveFamilyMemberResolver', context);
    const {
        deviceId,
        deviceName,
        tenantId,
        role,
        firstName: performingUserFirstName,
        lastName: performingUserLastName,
        version,
        buildNumber,
        deviceModel,
        osVersion,
        title,
        email,
        userId: sessionUserId,
        tenantShortCode
    } = context;
    const {userId} = args;

    const familyMemberInfo = await getFamilyMember(userId);
    if (!familyMemberInfo) {
        logger.error('Family member not found');
        throw new NotFoundError({description: 'Family member not found'});
    }

    const {patientId} = familyMemberInfo;
    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error('Encounter has ended!');
        throw new UnauthorizedError({description: 'Encounter has ended!'});
    }

    const patient = await getPatientById({id: patientId, tenantId});
    if (!patient) {
        logger.error('Patient not found');
        throw new UnauthorizedError({description: 'Patient not found'});
    }

    if (!(await sharesPatientsMapping(sessionUserId, familyMemberInfo.userId, patient.id))) {
        logger.error('Cannot remove a family member if you are not mapped to the same patient');
        throw new ForbiddenError({
            message: 'Cannot remove a family member if you are not mapped to the same patient'
        });
    }

    const notificationHubClient = await createNotificationHub();
    const familyMembers = await getFamilyMembersByPatientId(patientId);
    const primaryFamilyMembers = familyMembers.filter(
        (familyMember) => familyMember.primary === true
    );

    //removes all secondary family members if the last primary family member has been removed
    if (
        primaryFamilyMembers.length === 1 &&
        primaryFamilyMembers[0].id === userId &&
        familyMembers.length > 1
    ) {
        const recipients = await getFamilyMemberDevices(patientId, tenantId);
        const familyMembersData = recipients.map((recipient) => ({
            ...recipient,
            patientUlid: patient?.patientUlid
        }));

        if (!DISABLE_CSA_INTEGRATION && patient.patientUlid) {
            await removeUsersAsChatMembers(familyMembersData, tenantShortCode);
        }

        const result = await Promise.allSettled(
            familyMembers.map(async (familyMember) => {
                await removeFamilyMember(familyMember.id, patientId);

                if (recipients) {
                    const recipient = recipients.find((user) => user.id === familyMember.id);

                    if (recipient) {
                        const payload = await generatePushNotificationPayload(
                            recipient.notificationPlatform,
                            {
                                title: template(PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL)({
                                    appName: FAMILY_APP_NAME
                                }),
                                body: PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL,
                                sender: {},
                                type: REMOVE_FAMILY_MEMBER,
                                userId: recipient.id,
                                appVersion: recipient.appVersion,
                                patientId,
                                badge: 0
                            }
                        );

                        await sendPushNotification(notificationHubClient, recipient.id, payload);
                    }
                }

                await createAuditEvent({
                    eventId: FAMILY_UNENROLLED,
                    tenantId,
                    patientId: patient.id,
                    performingUserEmail: email,
                    userType: role,
                    userDisplayName: `${performingUserLastName}, ${performingUserFirstName}`,
                    deviceId: formatDeviceId(deviceName, deviceId),
                    deviceModel,
                    osVersion,
                    version,
                    buildNumber,
                    familyDisplayName:
                        familyMember.lastName && familyMember.firstName
                            ? `${familyMember.lastName} ${familyMember.firstName}`
                            : null,
                    familyRelation: familyMember.patientRelationship,
                    familyLanguage: getPreferredLanguage(familyMember.preferredLocale),
                    familyContactNumber: familyMember.phoneNumber,
                    locationId: patient?.location?.id,
                    performingUserTitle: title,
                    externalId: patient?.externalId
                });

                await Promise.all([
                    deleteSessionByUserId(familyMember.id),
                    deleteUserData(familyMember.id)
                ]);
            })
        );

        const failedRemovals = result.filter((response) => response.status === 'rejected');
        return failedRemovals.length === 0;
    }

    await createAuditEvent({
        eventId: FAMILY_UNENROLLED,
        tenantId,
        patientId: patient.id,
        performingUserEmail: email,
        userType: role,
        userDisplayName: `${performingUserLastName}, ${performingUserFirstName}`,
        deviceId: formatDeviceId(deviceName, deviceId),
        deviceModel,
        osVersion,
        version,
        buildNumber,
        familyDisplayName:
            familyMemberInfo.lastName && familyMemberInfo.firstName
                ? `${familyMemberInfo.lastName} ${familyMemberInfo.firstName}`
                : null,
        familyRelation: familyMemberInfo.patientRelationship,
        familyLanguage: getPreferredLanguage(familyMemberInfo.preferredLocale),
        familyContactNumber: familyMemberInfo.phoneNumber,
        locationId: patient?.location?.id,
        performingUserTitle: title,
        externalId: patient?.externalId
    });

    const device = await getDeviceInfoByUserId(userId);
    if (device) {
        const {notificationPlatform, appVersion} = device;
        const payload = await generatePushNotificationPayload(notificationPlatform, {
            title: template(PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL)({
                appName: FAMILY_APP_NAME
            }),
            body: PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL,
            sender: {},
            type: REMOVE_FAMILY_MEMBER,
            userId,
            appVersion,
            patientId,
            badge: 0
        });

        await sendPushNotification(notificationHubClient, userId, payload);
    }

    if (!DISABLE_CSA_INTEGRATION && patient.patientUlid) {
        await removeUserAsChatMember(
            userId,
            patient.patientUlid,
            tenantShortCode,
            device?.deviceId
        );
    }

    await Promise.all([deleteSessionByUserId(userId), deleteUserData(userId)]);

    return removeFamilyMember(userId, patientId);
}

module.exports = RemoveFamilyMemberResolver;
