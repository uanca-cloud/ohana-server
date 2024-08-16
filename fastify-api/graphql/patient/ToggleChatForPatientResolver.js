const {
    getLogger,
    isUserMappedToPatient,
    updateChatEnabledToPatient,
    ForbiddenError,
    publishPatientChatToggle
} = require('ohana-shared');

async function ToggleChatForPatientResolver(_parent, args, context) {
    const logger = getLogger('ToggleChatForPatientResolver', context);
    const {userId, deviceId, mappedPatients} = context;
    const {patientId, chatPatientEnabled} = args.input;

    const metadata = {...logger.bindings()?.metadata, patientId};

    if (!(await isUserMappedToPatient(userId, patientId, mappedPatients))) {
        logger.error({metadata}, 'Cannot toggle chat for a patient you are not mapped to');
        throw new ForbiddenError({
            message: 'Cannot toggle chat for a patient you are not mapped to'
        });
    }
    try {
        const response = await updateChatEnabledToPatient(patientId, chatPatientEnabled);
        if (response) {
            publishPatientChatToggle(patientId, chatPatientEnabled, deviceId);
        }

        return response.enableChat;
    } catch (error) {
        return chatPatientEnabled;
    }
}

module.exports = ToggleChatForPatientResolver;
