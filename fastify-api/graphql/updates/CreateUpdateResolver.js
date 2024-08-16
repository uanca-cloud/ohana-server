const {
        CONSTANTS: {
            REDIS_COLLECTIONS: {CAREGIVER_UPDATES},
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT
        },
        setRedisCollectionData,
        isClosedEncounter,
        getLogger,
        isUserMappedToPatient,
        getPatientByEncounterId,
        NotFoundError,
        ForbiddenError
    } = require('ohana-shared'),
    {v4: uuid} = require('uuid');

async function CreateUpdateResolver(_parent, args, context) {
    const logger = getLogger('CreateUpdateResolver', context);
    const {userId, tenantId, mappedPatients} = context;
    const {encounterId} = args;
    const metadata = {...logger.bindings()?.metadata, encounterId};

    const result = await isClosedEncounter(encounterId);
    if (result) {
        logger.error({metadata}, 'Encounter has ended');
        throw new ForbiddenError({message: 'Encounter has ended'});
    }

    const patient = await getPatientByEncounterId(encounterId);
    if (!patient) {
        logger.error({metadata}, 'Patient not found');
        throw new NotFoundError({description: 'Patient not found'});
    }

    if (!(await isUserMappedToPatient({userId, tenantId}, patient.id, mappedPatients))) {
        logger.error(
            {metadata},
            'Cannot create an update for a family member if you are not mapped to the same patient'
        );
        throw new ForbiddenError({
            message:
                'Cannot create an update for a family member if you are not mapped to the same patient'
        });
    }

    const id = uuid();
    const CAREGIVER_SESSION_INACTIVITY_IN_SECS_DEFAULT =
        parseInt(CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT) * 60 * 60;
    await setRedisCollectionData(
        CAREGIVER_UPDATES,
        CAREGIVER_SESSION_INACTIVITY_IN_SECS_DEFAULT,
        id,
        {encounterId, userId}
    );

    return {id};
}

module.exports = CreateUpdateResolver;
