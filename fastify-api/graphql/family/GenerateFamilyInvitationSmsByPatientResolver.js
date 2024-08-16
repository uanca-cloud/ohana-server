const {
    bootstrapAzureServiceBusClient,
    pushMessageInQueue,
    CONSTANTS: {
        FAMILY_APP_NAME,
        SERVICE_BUS_SMS_QUEUE_NAME,
        OHANA_ROLES: {FAMILY_MEMBER}
    },
    UnauthorizedError,
    ForbiddenError,
    getFamilyInvitationUrl,
    getLogger,
    hasOpenEncounter,
    getPatientById,
    isUserMappedToPatient,
    isAllowSecondaryFamilyMemberForPatient
} = require('ohana-shared');

async function GenerateFamilyInvitationSmsByPatientResolver(_parent, args, context) {
    const logger = getLogger('GenerateFamilyInvitationSmsByPatientResolver', context);
    const {tenantId, userId, role, mappedPatients} = context;
    const {patientId, phoneNumber} = args;

    const metadata = {...logger.bindings()?.metadata, patientId};

    const serviceBusClient = bootstrapAzureServiceBusClient();

    if (!(await hasOpenEncounter(patientId, tenantId))) {
        logger.error({metadata}, 'No active encounter found!');
        throw new UnauthorizedError({description: 'No active encounter found!'});
    }

    if (role === FAMILY_MEMBER && !(await isAllowSecondaryFamilyMemberForPatient(patientId))) {
        logger.error({metadata}, 'Family member is not authorized to invite a new family member');
        throw new ForbiddenError({
            message: 'Family member is not authorized to invite a new family member'
        });
    }

    const patient = await getPatientById({id: patientId, tenantId});
    if (patient) {
        if (!(await isUserMappedToPatient({userId, tenantId}, patient.id, mappedPatients))) {
            logger.error(
                {metadata},
                'Cannot invite a new family member for a patient you are not mapped to'
            );
            throw new ForbiddenError({
                message: 'Cannot invite a new family member for a patient you are not mapped to'
            });
        }
        const url = await getFamilyInvitationUrl({
            patientId,
            tenantId,
            phoneNumber,
            invitedBy: userId,
            role
        });
        const msg = `You are invited to ${FAMILY_APP_NAME} to receive updates about your loved one's care. Open the link to download the application. ${url}`;
        const message = `{"phoneNumber": "${phoneNumber}", "msg":"${msg}"}`;

        if (url) {
            await pushMessageInQueue(serviceBusClient, SERVICE_BUS_SMS_QUEUE_NAME, message);
            logger.debug({metadata}, 'Family invitation sent via sms by patient successfully.');
            return true;
        }
        return false;
    }

    return false;
}

module.exports = GenerateFamilyInvitationSmsByPatientResolver;
