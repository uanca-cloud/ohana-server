const {
    getLogger,
    bootstrapAzf,
    getInactiveEncounters,
    endEncounters,
    runWithTransaction,
    getPatientsWithClosedEncounters,
    unEnrollPatients,
    deletePatientsChatChannel
} = require('ohana-shared');

const logger = getLogger('AutoUnenrollPatientFunction');
let bootstrapped = false;

async function AutoUnenrollPatientScheduledFunction() {
    const startTime = Date.now();
    logger.debug('ENTER:AutoUnenrollPatient');
    if (!bootstrapped) {
        await bootstrapAzf(false);
    }

    const patients = await runWithTransaction(async (dbClient) => {
        const inactiveEncounters = await getInactiveEncounters(dbClient);

        if (inactiveEncounters) {
            const inactiveEncounterIds = inactiveEncounters.map((encounter) =>
                parseInt(encounter.id)
            );

            await endEncounters(inactiveEncounterIds, dbClient);
        }

        return await getPatientsWithClosedEncounters(dbClient);
    });

    if (patients?.length > 0) {
        logger.debug('Un-enrolling patients...');
        await unEnrollPatients(patients);
        logger.debug('Removing chat channels associated with patients...');
        await deletePatientsChatChannel(patients);
    }

    logger.debug({metadata: {duration: Date.now() - startTime}}, 'EXIT:AutoUnenrollPatient');
}

module.exports = AutoUnenrollPatientScheduledFunction;
