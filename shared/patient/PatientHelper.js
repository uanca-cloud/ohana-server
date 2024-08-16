const {
        createNotificationHub,
        generatePushNotificationPayload,
        sendPushNotification
    } = require('../AzureNotificationHubGateway'),
    {removeFamilyMembersByPatientId} = require('../family/FamilyIdentityDao'),
    {runWithTransaction} = require('../DaoHelper'),
    {getFamilyMembersWithDevicesByPatientIds} = require('../user/UserDao'),
    {isUserMappedToPatient} = require('../user/UserAuthorizationHelper'),
    {removeSessionMappedPatientForAllUsers} = require('../SessionService'),
    template = require('lodash.template'),
    {
        PUSH_NOTIFICATIONS_TYPES: {UNENROLL},
        PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL,
        PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL,
        FAMILY_APP_NAME,
        TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE},
        LOCATION_SETTINGS_KEYS: {ALLOW_SECONDARY_FAMILY_MEMBERS}
    } = require('../constants'),
    {unenrollPatientsById, updatePatientAllowSecondary, updatePatient} = require('./PatientDao'),
    {deleteSessionsByUserIds} = require('../SessionService'),
    {getLogger} = require('../logs/LoggingService'),
    {getTenantSetting} = require('../tenant/TenantSettingsDao'),
    {hasOpenEncounter} = require('./EncounterDao'),
    {getLocationSetting} = require('../location/LocationSettingsDao'),
    {ForbiddenError} = require('../custom-errors'),
    {removeUsersAsChatMembers} = require('../chat/ChatHelper'),
    {deleteChatChannel} = require('../chat/ChatDao');

const logger = getLogger('PatientHelper');

/**
 * Un-enroll patients by removing all the associated FMs and setting patients' location to null
 * Notify active FMs about this action
 * user ids should only contain FMs (not CGs)
 * @param {Object[]} patients
 * @param {String} patients[].patientId
 * @param {String} patients[].tenantId
 * @param {String} patients[].counterId
 * @param {String} patients[].userId
 * @returns {Promise<void>}
 */
async function unEnrollPatients(patients) {
    const startTime = Date.now();
    const patientIds = patients.map((patient) => patient.patientId);
    const familyMemberUserIds = patients.map((patient) => patient.familyMemberUserIds).flat();
    const caregiverUserIds = patients.map((patient) => patient.caregiverUserIds).flat();
    const familyMembers = await getFamilyMembersWithDevicesByPatientIds(patientIds);

    for (let patient of patients) {
        await runWithTransaction(async (dbClient) => {
            await Promise.allSettled([
                removeFamilyMembersByPatientId(patient.patientId, patient.familyMemberUserIds),
                unenrollPatientsById(patient.patientId, dbClient),
                removeSessionMappedPatientForAllUsers(patient.patientId, caregiverUserIds)
            ]);
        });
    }

    await Promise.allSettled([
        removeUsersAsChatMembers(familyMembers),
        deleteSessionsByUserIds(familyMemberUserIds),
        recipientsUnenrollmentNotify(familyMembers)
    ]);
    logger.debug({metadata: {duration: Date.now() - startTime}}, 'Un-enrolling patients...');
}

/**
 * Notify recipient devices about being unenrolled
 * @param recipientDevices
 * @returns {Promise<void>}
 */
async function recipientsUnenrollmentNotify(recipientDevices) {
    if (!recipientDevices) {
        logger.info('No FM devices to unenroll');
        return;
    }
    const notificationHubClient = await createNotificationHub();

    await Promise.allSettled(
        recipientDevices.map(async (recipientDevice) => {
            const payload = await generatePushNotificationPayload(
                recipientDevice.notificationPlatform,
                {
                    title: template(PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL)({
                        appName: FAMILY_APP_NAME
                    }),
                    body: PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL,
                    sender: {},
                    type: UNENROLL,
                    userId: recipientDevice.id,
                    appVersion: recipientDevice.appVersion,
                    patientId: recipientDevice.patientId,
                    badge: 0
                }
            );

            await sendPushNotification(notificationHubClient, recipientDevice.id, payload);
        })
    );
}

/**
 * Updates patient details in the db
 * @param patient
 * @param context
 * @returns {Promise<*>}
 */
async function updatePatientData(patient, context) {
    logger.debug('Updating patient data...');
    const {userId, tenantId, mappedPatients} = context;
    const {
        id,
        firstName,
        lastName,
        dateOfBirth,
        location,
        allowSecondaryFamilyMembers,
        externalId
    } = patient;

    const setting = await getTenantSetting({tenantId, key: EXTERNAL_ID_TYPE});
    const externalIdType = setting ? setting.value : null;

    if (!(await hasOpenEncounter(id, tenantId))) {
        logger.error(
            {metadata: {userId, tenantId, patientId: id}},
            'Patient does not have any ongoing encounter'
        );
        throw new ForbiddenError({message: 'Patient does not have any ongoing encounter'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, id, mappedPatients))) {
        logger.error("Cannot update a patient's data if you are not mapped to that patient");
        throw new ForbiddenError({
            message: "Cannot update a patient's data if you are not mapped to that patient"
        });
    }

    const allowSecondaryFamilyMemberFromAdmin = await getLocationSetting({
        locationId: location,
        tenantId,
        key: ALLOW_SECONDARY_FAMILY_MEMBERS
    });
    if (
        allowSecondaryFamilyMemberFromAdmin &&
        allowSecondaryFamilyMemberFromAdmin.value === 'true'
    ) {
        await updatePatientAllowSecondary({
            patientId: id,
            allowSecondary: !!allowSecondaryFamilyMembers
        });
    }

    const dateOfBirthUTC = new Date(`${dateOfBirth}T00:00:00Z`);
    return updatePatient({
        id,
        firstName,
        lastName,
        dateOfBirth: dateOfBirthUTC,
        location,
        externalIdType,
        tenantId,
        externalId
    });
}

/**
 * Deleting Patients ChatChannel
 * @returns {Promise<void>}
 * @param {Object[]} patients
 * @param {String} patients[].ccCreatorUserId
 * @param {String} patients[].patientUlid
 * @param {String} patients[].tenantId
 */
async function deletePatientsChatChannel(patients) {
    const startTime = Date.now();
    const deletePromises = patients
        .filter((patient) => patient.patientUlid)
        .map((patient) =>
            deleteChatChannel(patient.patientUlid, patient.ccCreatorUserId, patient.tenantId)
        );
    await Promise.allSettled(deletePromises);
    logger.debug(
        {metadata: {duration: Date.now() - startTime}},
        'Removing chat channels associated with patients'
    );
}

module.exports = {
    updatePatientData,
    unEnrollPatients,
    recipientsUnenrollmentNotify,
    deletePatientsChatChannel
};
