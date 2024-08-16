const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        WHITELISTED_ROLES_TO_ENROLL_PATIENT,
        EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE,
        OHANA_ROLES: {FAMILY_MEMBER, CAREGIVER},
        LOCATION_SETTINGS_KEYS: {CHAT_LOCATION_ENABLED}
    } = require('../constants'),
    {runWithTransaction} = require('../DaoHelper'),
    {createEncounter, updateEncounter, addEncounter, updateEncounters} = require('./EncounterDao'),
    {
        createUserPatientMapping,
        getUserPatientMapping,
        updateUserPatientMappingDeletedStatus
    } = require('./UserPatientMappingDao'),
    {createPatientTemplate, createLocationTemplate} = require('../EntitiesFactory'),
    NotUniqueError = require('../custom-errors/not-unique-error'),
    {getLogger} = require('../logs/LoggingService'),
    {dateFromIsoTimestamp} = require('../DateFormattingHelper');

const logger = getLogger('PatientDao');

/**
 * @typedef {Object} Patient
 * @property {string} patientId
 * @property {string} externalId
 * @property {string} externalIdType
 * @property {string} tenantId
 * @property {string} firstName
 * @property {string} lastname
 * @property {string} dateOfBirth
 * @property {number} location
 */

/**
 *
 * @param dbClient - A database client instance
 * @param patient Patient
 * @returns {Promise<null|{id:number}>}
 */
async function createPatient(patient, dbClient) {
    logger.debug('Creating a patient...');
    const {
        externalId,
        externalIdType,
        tenantId,
        firstName,
        lastName,
        dateOfBirth,
        location,
        cdrId,
        allowSecondaryFamilyMembers
    } = patient;
    const insertPatientQuery = ` 
        INSERT INTO patients (
            external_id,
            external_id_type,
            tenant_id,
            first_name,
            last_name,
            date_of_birth,
            location_id,
            cdr_id,
            allow_secondary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)    
        ON CONFLICT(external_id, external_id_type, tenant_id) 
        DO UPDATE SET
        first_name = $4,
        last_name = $5,
        date_of_birth = $6,
        location_id = $7,
        cdr_id = $8,
        allow_secondary = $9
        WHERE patients.external_id = $1 RETURNING id;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return client.query(insertPatientQuery, [
        externalId,
        externalIdType,
        tenantId,
        firstName,
        lastName,
        dateOfBirth,
        location,
        cdrId,
        allowSecondaryFamilyMembers
    ]);
}

async function getLocationIdByPatientId(patient, dbClient) {
    logger.debug('Getting location by patient id...');
    const {patientId = null, tenantId, externalId = null} = patient;

    const patientQuery = `
        SELECT l.id AS location_id
        FROM patients p 
        INNER JOIN locations l ON p.location_id = l.id 
        INNER JOIN encounters e ON e.patient_id=p.id
        WHERE (p.id = $1 OR p.external_id = $3) AND p.tenant_id = $2 and e.ended_at IS null;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [patientId, tenantId, externalId]);

    if (!result.rowCount) {
        logger.info({metadata: {patientId, tenantId}}, 'No patient was found');
        return null;
    }

    return result.rows[0].location_id;
}

/**
 *
 * @param dbClient - A database client instance
 * @param patient Patient
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function getPatientById(patient, dbClient) {
    logger.debug('Getting a patient by id...');
    const {id = null, tenantId, externalId = null} = patient;
    const patientQuery = `
        SELECT 
            p.id, 
            p.external_id, 
            p.external_id_type, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth,
            l.id AS location, 
            l.label AS label,
            e.id AS encounter,
            e.external_id as encounter_external_id,
            p.allow_secondary,
            max(e.updated_at) as last_updated_at,
            p.patient_ulid,
            p.enable_chat
        FROM patients p 
        LEFT JOIN encounters e ON e.patient_id=p.id
        LEFT JOIN locations l ON p.location_id=l.id
        WHERE ((p.id = $1 OR p.external_id = $3) OR e.external_id = $3) AND p.tenant_id = $2 and e.ended_at IS null
        GROUP BY p.id, l.id, e.id
        ORDER BY e.updated_at DESC        
        LIMIT 1;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [id, tenantId, externalId]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, patientId: id}}, 'No patient was found');
        return null;
    }

    return createPatientTemplate({
        id: result.rows[0].id,
        externalId: result.rows[0].external_id,
        externalIdType: result.rows[0].external_id_type,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        dateOfBirth: dateFromIsoTimestamp(result.rows[0].date_of_birth),
        location: createLocationTemplate({
            id: result.rows[0].location,
            label: result.rows[0].label
        }),
        encounterId: result.rows[0].encounter,
        lastEncounterId: result.rows[0].encounter,
        allowSecondaryFamilyMembers: result.rows[0].allow_secondary,
        lastUpdatedAt: result.rows[0].last_updated_at
            ? new Date(result.rows[0].last_updated_at).toISOString()
            : null,
        patientUlid: result.rows[0].patient_ulid,
        enableChat: result.rows[0].enable_chat
    });
}

/**
 *
 * @param dbClient - A database client instance
 * @param patient Patient
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function getPatientByIdAndEncounter(patient, dbClient) {
    logger.debug('Getting patient by id and encounter...');
    const {id, encounterId} = patient;
    const patientQuery = `
        SELECT 
            p.id, 
            p.external_id AS patient_external_id, 
            p.external_id_type, 
            p.allow_secondary, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth,
            p.patient_ulid,
            l.id AS location, 
            l.label AS label,
            e.id AS encounter,
            e.external_id AS encounter_external_id
        FROM patients p 
        LEFT JOIN locations l ON p.location_id=l.id 
        INNER JOIN encounters e ON e.patient_id=p.id
        WHERE p.id = $1 and e.id = $2 and e.ended_at IS null;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [id, encounterId]);

    if (!result.rowCount) {
        logger.info({metadata: {encounterId, patientId: id}}, 'No patient was found');
        return null;
    }

    return createPatientTemplate({
        id: result.rows[0].id,
        externalId: result.rows[0].patient_external_id,
        externalIdType: result.rows[0].external_id_type,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        dateOfBirth: dateFromIsoTimestamp(result.rows[0].date_of_birth),
        location: createLocationTemplate({
            id: result.rows[0].location,
            label: result.rows[0].label
        }),
        encounterId: result.rows[0].encounter,
        lastEncounterId: result.rows[0].encounter,
        allowSecondaryFamilyMembers: result.rows[0].allow_secondary,
        patientUlid: result.rows[0].patient_ulid
    });
}

/**
 *
 * @param encounterId String
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function getPatientByEncounterId(encounterId) {
    logger.debug('Getting a patient by encounter id...');
    const patientQuery = `
        SELECT 
            p.id, 
            p.external_id, 
            p.external_id_type, 
            p.allow_secondary, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth, 
            l.id AS location, 
            l.label AS label,
            e.id AS encounter,
            e.external_id AS encounter_external_id
        FROM patients p LEFT JOIN locations l ON p.location_id=l.id 
        INNER JOIN encounters e ON e.patient_id=p.id
        WHERE e.id = $1 and e.ended_at IS null;
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [encounterId]);

    if (!result.rowCount) {
        logger.info({metadata: {encounterId}}, 'No patient was found');
        return null;
    }

    return createPatientTemplate({
        id: result.rows[0].id,
        externalId: result.rows[0].external_id,
        externalIdType: result.rows[0].external_id_type,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        dateOfBirth: dateFromIsoTimestamp(result.rows[0].date_of_birth),
        location: createLocationTemplate({
            id: result.rows[0].location,
            label: result.rows[0].label
        }),
        encounterId: result.rows[0].encounter,
        lastEncounterId: result.rows[0].encounter,
        allowSecondaryFamilyMembers: result.rows[0].allow_secondary
    });
}

/**
 *
 * @param patient Patient
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function enrollPatient(patient) {
    logger.debug('Enrolling patient...');
    const {externalId, externalIdType, userId, tenantId, assignedRoles} = patient;
    let newPatient = null;

    if (WHITELISTED_ROLES_TO_ENROLL_PATIENT.some((role) => assignedRoles.includes(role))) {
        await runWithTransaction(async (dbClient) => {
            const patientResult = await createPatient(patient, dbClient);
            const encounterResult = await createEncounter(
                {
                    patientId: patientResult.rows[0].id,
                    tenantId: tenantId,
                    externalId:
                        externalIdType === EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE ? externalId : null
                },
                dbClient
            );
            // create new mapping if the patient does not have an ongoing encounter
            if (encounterResult.rowCount) {
                await createUserPatientMapping(
                    {
                        patientId: patientResult.rows[0].id,
                        userId,
                        encounterId: encounterResult.rows[0].id
                    },
                    dbClient
                );
                newPatient = await getPatientById(
                    {
                        id: patientResult.rows[0].id,
                        tenantId
                    },
                    dbClient
                );
            } else {
                logger.error(
                    {
                        metadata: {
                            userId,
                            tenantId
                        }
                    },
                    'An active encounter already exists!'
                );
                throw new NotUniqueError({description: 'An active encounter already exists!'});
            }
        });
    } else {
        logger.info('User cannot enroll patients');
    }
    return newPatient;
}

async function addEncounterToPatient(patient) {
    logger.debug('Adding a new encounter to an existing patient...');
    const {userId, tenantId, id, externalId, externalIdType, assignedRoles} = patient;
    let newPatient = null;

    if (WHITELISTED_ROLES_TO_ENROLL_PATIENT.some((role) => assignedRoles.includes(role))) {
        await runWithTransaction(async (dbClient) => {
            await updateEncounters({patientId: id}, dbClient);
            const encounterResult = await addEncounter(
                {
                    patientId: id,
                    tenantId,
                    externalId:
                        externalIdType === EXTERNAL_ID_TYPE_VISIT_NUMBER_CODE ? externalId : null
                },
                dbClient
            );
            await updatePatient(patient, dbClient);

            await createUserPatientMapping(
                {
                    patientId: id,
                    userId,
                    encounterId: encounterResult.rows[0].id
                },
                dbClient
            );
            newPatient = await getPatientByIdAndEncounter(
                {
                    id,
                    encounterId: encounterResult.rows[0].id
                },
                dbClient
            );
        });
    } else {
        logger.info('User cannot enroll patients');
    }
    return newPatient;
}

/**
 *
 * @param dbClient database instance
 * @param patient Patient
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function updatePatient(patient, dbClient) {
    logger.debug('Updating a patient...');
    const {firstName, lastName, dateOfBirth, location, id, tenantId, externalId} = patient;
    let updatePatientQuery = `
            UPDATE patients SET
                    first_name = $1,    
                    last_name = $2,
                    date_of_birth = $3,
                    location_id = $4
            WHERE id = $5;
        `;
    const paramsArray = [firstName, lastName, dateOfBirth, location, id];

    if (externalId) {
        updatePatientQuery = `
            UPDATE patients SET
                    first_name = $1,    
                    last_name = $2,
                    date_of_birth = $3,
                    location_id = $4,
                    external_id = $6
            WHERE id = $5;
        `;

        paramsArray.push(externalId);
    }

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(updatePatientQuery, paramsArray);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, patientId: id}}, 'No patient exists');
        return null;
    }

    return getPatientById({id, tenantId}, client);
}

/**
 *
 * @param dbClient database instance
 * @param patient Patient
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function updatePatientExternalId(patient, dbClient) {
    logger.debug("Updating a patient's external id...");
    const {patientId, externalId, tenantId} = patient;
    const updatePatientQuery = `
            UPDATE patients SET
                    external_id = $1
            WHERE id = $2;
        `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(updatePatientQuery, [externalId, patientId]);

    if (!result.rowCount) {
        logger.info({metadata: {patientId, tenantId}}, 'No patient exists');
        return null;
    }

    return getPatientById({id: patientId, tenantId}, client);
}

/**
 *
 * @param user String
 * @returns {Promise<null|[{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}]>}
 */
async function getPatientsByUser(user) {
    logger.debug('Getting patients by user...');
    const patientsQuery = ` 
        SELECT DISTINCT ON (p.id) 
            p.id, 
            p.external_id, 
            p.external_id_type, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth, 
            l.id AS location, 
            l.label AS label,
            e.id AS encounter,
            e.external_id AS encounter_external_id,
            p.allow_secondary,
            max(e.updated_at) as last_updated_at,
            p.patient_ulid,
            p.enable_chat,
            ls.value as location_enable_chat,
            upm.notification_level
        FROM patients p 
        LEFT JOIN encounters e ON e.patient_id=p.id
        LEFT JOIN locations l ON p.location_id=l.id        
        INNER JOIN users_patients_mapping upm ON upm.patient_id=p.id
        LEFT JOIN updates u ON u.patient_id = p.id
        LEFT JOIN location_settings ls ON 
            ls.location_id=p.location_id
            AND ls.key = $3
        WHERE upm.user_id = $1
            AND p.tenant_id = $2
            AND e.ended_at IS null
            AND upm.deleted = false
        GROUP BY p.id, l.id, e.id, ls.value, upm.notification_level;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(patientsQuery, [
        user.userId,
        user.tenantId,
        CHAT_LOCATION_ENABLED
    ]);

    if (!results.rowCount) {
        logger.info(
            {metadata: {userId: user.userId, tenantId: user.tenantId}},
            'No patients were found'
        );
        return [];
    }

    return results.rows.map((result) =>
        createPatientTemplate({
            id: result.id,
            externalId: result.external_id,
            externalIdType: result.external_id_type,
            firstName: result.first_name,
            lastName: result.last_name,
            dateOfBirth: dateFromIsoTimestamp(result.date_of_birth),
            location: createLocationTemplate({id: result.location, label: result.label}),
            encounterId: result.encounter,
            lastEncounterId: result.encounter,
            lastUpdatedAt: result.last_updated_at
                ? new Date(result.last_updated_at).toISOString()
                : null,
            allowSecondaryFamilyMembers: result.allow_secondary,
            patientUlid: result.patient_ulid,
            enableChat: result.enable_chat,
            chatLocationEnabled: result.location_enable_chat,
            notificationLevel: result.notification_level
        })
    );
}

async function getLocationIdByEncounterId(encounterId) {
    logger.debug('Getting location id by encounter id...');
    const locationIdQuery = `SELECT patients.location_id FROM patients LEFT JOIN encounters ON patients.id = encounters.patient_id WHERE encounters.id = $1;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationIdQuery, [encounterId]);

    return result.rowCount ? result.rows[0].location_id : null;
}

/**
 * Un-enroll patients by setting their location to null
 * @param dbClient
 * @param patientId
 * @returns {Promise<unknown[]>}
 */
async function unenrollPatientsById(patientId, dbClient) {
    logger.debug('Unenrolling patients...');
    const unenrollQuery = `
        UPDATE patients
        SET patient_ulid = NULL,
            location_id = NULL,
            cc_creator_user_id = NULL
        WHERE id = $1;
    `;
    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await pool.query(unenrollQuery, [patientId]);
}

async function assignUserToPatient(patient) {
    logger.debug('Assigning a user to a patient...');
    const {patientId, encounterId, userId, tenantId} = patient;

    await runWithTransaction(async (dbClient) => {
        const externalId = await updateEncounter({encounterId}, dbClient);
        if (externalId) {
            await updatePatientExternalId({patientId, externalId, tenantId}, dbClient);
        }

        const userPatientMappings = await getUserPatientMapping(
            {
                patientId,
                encounterId,
                userId
            },
            dbClient
        );
        if (!userPatientMappings) {
            await createUserPatientMapping({patientId, encounterId, userId}, dbClient);
        } else {
            await updateUserPatientMappingDeletedStatus(
                {
                    patientId,
                    encounterIds: [encounterId],
                    userId
                },
                dbClient
            );
        }
    });

    return getPatientByIdAndEncounter({id: patientId, encounterId});
}

async function getPatientByCdrId(cdrId, tenantId) {
    logger.debug('Getting a patient by cdr id...');
    const patientQuery = `
        SELECT p.id,
            p.external_id,
            p.external_id_type,
            p.tenant_id
        FROM patients p
        INNER JOIN encounters e ON p.id = e.patient_id
        WHERE p.cdr_id = $1 
            AND p.tenant_id = $2;
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [cdrId, tenantId]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, cdrId}}, 'No patient was found');
        return null;
    }

    return {
        id: result.rows[0].id,
        externalId: result.rows[0].external_id,
        externalIdType: result.rows[0].external_id_type,
        tenantId: result.rows[0].tenant_id
    };
}

async function updatePatientAllowSecondary(patient, dbClient) {
    const {patientId, allowSecondary} = patient;
    const updateEncounterAllowSecondaryQuery = `
        UPDATE patients SET allow_secondary = $1 WHERE id = $2;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(updateEncounterAllowSecondaryQuery, [allowSecondary, patientId]);
}

/**
 * Returns patients that no longer have any active encounters and their associated FMs
 * @param dbClient
 * @returns {Promise<{patientId: String, tenantId: String, ccCreatorUserId: String, encounterIds: String[], userIds: String[]}[]|null>}
 */
async function getPatientsWithClosedEncounters(dbClient) {
    const patientsQuery = `
        WITH unenroll_patients AS (
            SELECT 
                p.id as patient_id,
                p.tenant_id,
                p.patient_ulid,
                p.cc_creator_user_id,
                array_agg(e.id) as encounter_ids
            FROM patients p
            LEFT JOIN encounters e ON p.id = e.patient_id
            WHERE p.location_id IS NOT NULL
                AND e.ended_at IS NOT NULL
                AND p.id NOT IN (
                    SELECT en.patient_id
                    FROM encounters en
                    WHERE en.patient_id = p.id 
                    AND en.ended_at IS NULL
                )
            GROUP BY p.id
        ),
        family_members AS (
            SELECT up.patient_id, array_agg(DISTINCT upm.user_id) user_ids
            FROM unenroll_patients up
            LEFT JOIN users_patients_mapping upm ON upm.patient_id = up.patient_id
            LEFT JOIN users u ON u.user_id = upm.user_id
            WHERE 
                u.assigned_roles @> ARRAY[$1]
        GROUP BY up.patient_id
        ),
        caregivers AS (
            SELECT up.patient_id, array_agg(DISTINCT upm.user_id) user_ids
            FROM unenroll_patients up
            LEFT JOIN users_patients_mapping upm ON upm.patient_id = up.patient_id
            LEFT JOIN users u ON u.user_id = upm.user_id
            WHERE 
                u.assigned_roles @> ARRAY[$2]
        GROUP BY up.patient_id
        )
        SELECT 
            up.encounter_ids,
            up.patient_id,
            up.tenant_id,
            up.patient_ulid,
            up.cc_creator_user_id,
            COALESCE(fm.user_ids, array[]::varchar[]) family_member_user_ids,
            COALESCE(cg.user_ids, array[]::varchar[]) caregivers_user_ids
            FROM unenroll_patients up 
            LEFT JOIN family_members fm ON fm.patient_id=up.patient_id
            LEFT JOIN caregivers cg ON cg.patient_id=up.patient_id
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await client.query(patientsQuery, [FAMILY_MEMBER, CAREGIVER]);

    if (!result.rowCount) {
        logger.info('No patient with closed encounters was found');
        return null;
    }

    return result.rows.map((patientResult) => ({
        encounterIds: patientResult.encounter_ids,
        patientId: patientResult.patient_id,
        patientUlid: patientResult.patient_ulid,
        tenantId: patientResult.tenant_id,
        familyMemberUserIds: patientResult.family_member_user_ids,
        caregiverUserIds: patientResult.caregivers_user_ids,
        ccCreatorUserId: patientResult.cc_creator_user_id
    }));
}

async function isAllowSecondaryFamilyMemberForPatient(patientId) {
    const queryText = `
        SELECT COUNT(*)
        FROM patients
        WHERE id = $1 
            AND allow_secondary = true
        LIMIT 1
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId]);

    return result?.rows[0]?.count > 0;
}

/**
 * @param user String
 * @returns {Promise<null|[id: number]>}
 */
async function getAllPatientsIdsByUser(user) {
    logger.debug('Getting patient Ids by user...');
    const {userId, tenantId} = user;
    const patientsQuery = ` 
        SELECT DISTINCT ON (p.id) 
            p.id
        FROM patients p   
        INNER JOIN users_patients_mapping upm ON upm.patient_id=p.id
        LEFT JOIN encounters e ON e.patient_id=p.id
        WHERE upm.user_id = $1
            AND p.tenant_id = $2
            AND e.ended_at IS null
            AND upm.deleted = false;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(patientsQuery, [userId, tenantId]);

    if (!results.rowCount) {
        logger.info({metadata: {userId, tenantId}}, 'No patient Ids were found');
        return [];
    }

    return results.rows.map((result) => result.id);
}

/**
 * Returns patient id and all active encounters
 * @param patientId
 * @param dbClient
 * @returns {Promise<{patientId: String, encounterIds: String[]}>}
 */
async function getPatientActiveEncountersById(patientId, dbClient) {
    logger.debug('Getting a patient active encounters by id...');
    const patientQuery = `
        SELECT
            l.id AS location_id,
            p.id as patient_id,
             p.patient_ulid as patient_ulid,
            array_agg(e.id) as encounter_ids
        FROM patients p
        LEFT JOIN locations l ON p.location_id=l.id 
        LEFT JOIN encounters e ON e.patient_id=p.id
        WHERE p.id = $1 AND e.ended_at IS null
        GROUP BY p.id, l.id
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [patientId]);

    if (!result.rowCount) {
        logger.info({metadata: {patientId}}, 'No patient was found with active encounters');
        return null;
    }

    return {
        encounterIds: result.rows[0].encounter_ids,
        patientId: result.rows[0].patient_id,
        patientUlid: result.rows[0].patient_ulid,
        locationId: result.rows[0].location_id
    };
}

/**
 * Updates Patient with information relevant to the chat Channel creation
 * @param patientId
 * @param patientUlid
 * @param tenantId
 * @param userId (channel Creator)
 * @param dbClient
 * @returns {Promise<null|*>}
 */
async function addPatientChatChannelInformation(
    patientId,
    patientUlid,
    tenantId,
    userId,
    dbClient
) {
    logger.debug('Adding patient Ulid and user_id (user creator) to patient...');
    let updatePatientQuery = `
            UPDATE patients SET
                patient_ulid = $1,
                cc_creator_user_Id = $3
            WHERE id = $2;
        `;

    const paramsArray = [patientUlid, patientId, userId];
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(updatePatientQuery, paramsArray);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, patientId, userId}}, 'No patient exists');
        return null;
    }

    return getPatientById({id: patientId, tenantId}, client);
}

async function getPatientIdFromUlid(patientUlid) {
    logger.debug('Getting patient ID by ULID...');
    const query = ` 
        SELECT p.id
        FROM patients p   
        JOIN encounters e ON e.patient_id = p.id
        WHERE p.patient_ulid = $1
            AND e.ended_at IS NULL;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(query, [patientUlid]);

    if (!results.rowCount) {
        logger.info({metadata: {patientUlid}}, 'No patient found');
        return null;
    }

    return results.rows[0].id;
}

/**
 * Returns a list with patient information
 * @param userId
 * @returns {Promise<null|*>}
 */
async function getPatientsWithChatChannelLinkedToUser(userId) {
    logger.debug('Getting patients with chat channel linked to a user...');
    const patientsQuery = ` 
        SELECT DISTINCT ON (p.id) 
            p.id, 
            p.external_id, 
            p.external_id_type, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth,
            p.patient_ulid
        FROM patients p 
        LEFT JOIN encounters e ON e.patient_id=p.id        
        INNER JOIN users_patients_mapping upm ON upm.patient_id=p.id
        WHERE upm.user_id = $1
            AND e.ended_at IS null
            AND p.patient_ulid IS NOT null
            AND upm.deleted = false
        GROUP BY p.id, e.id;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(patientsQuery, [userId]);

    if (!results.rowCount) {
        logger.info({metadata: {userId}}, 'No patients were found');
        return [];
    }

    return results.rows.map((result) =>
        createPatientTemplate({
            id: result.id,
            externalId: result.external_id,
            externalIdType: result.external_id_type,
            firstName: result.first_name,
            lastName: result.last_name,
            dateOfBirth: dateFromIsoTimestamp(result.date_of_birth),
            patientUlid: result.patient_ulid
        })
    );
}

/**
 * @param patientId int
 * @param chatPatientEnabled boolean
 * @returns {Promise<{enableChat: Boolean}>}
 */
async function updateChatEnabledToPatient(patientId, chatPatientEnabled) {
    logger.debug('Toggling chat for patient...');

    const chatToggleOnPatient = `
        UPDATE patients 
        SET enable_chat = $1 
        WHERE id = $2
            AND enable_chat <> $1
        RETURNING patients.enable_chat;
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await client.query(chatToggleOnPatient, [chatPatientEnabled, patientId]);

    if (!result.rowCount) {
        logger.error({metadata: {patientId, chatPatientEnabled}}, 'Value already exists');
        throw new Error('Value already exists');
    }

    return {enableChat: result.rows[0].enable_chat};
}

/**
 * @param patientUlids String[]
 * @returns {Promise<{id: int, patient_ulid: String, first_name: String, last_name: String, enable_chat: Boolean, chat_location_enabled: Boolean}[]>}
 */
async function getPatientsByUlids(patientUlids) {
    const patientsQuery = `
        SELECT
            p.id,
            p.patient_ulid,
            p.first_name,
            p.last_name,
            p.enable_chat,
            l.value as chat_location_enabled
        FROM patients p
        INNER JOIN encounters e ON e.patient_id=p.id
        LEFT JOIN location_settings l ON 
            l.location_id=p.location_id
            AND l.key = 'chatLocationEnabled'
        WHERE p.patient_ulid = ANY ($1::text[]) AND e.ended_at IS null
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    try {
        const result = await client.query(patientsQuery, [patientUlids]);
        return result.rows.map((patient) => {
            return createPatientTemplate(patient);
        });
    } catch (error) {
        logger.error({error}, 'Error occurred when getting patients by patientUlids!');
        return [];
    }
}

/**
 *
 * @param patient Patient
 * @param userId Id for the user currently performing the action - needed for notificationLevel
 * @param dbClient - A database client instance
 * @returns {Promise<null|{id: number, firstName: String, lastName: String, externalId: String, dateOfBirth: String, location: {id: number, label: String}}>}
 */
async function getPatientChatInformationByIdAndUserId(patient, userId, dbClient) {
    logger.debug('Getting a patient by id...');
    const {id = null, tenantId, externalId = null} = patient;
    const patientQuery = `
        SELECT 
            p.id, 
            p.external_id, 
            p.external_id_type, 
            p.first_name, 
            p.last_name, 
            p.date_of_birth,
            l.id AS location, 
            l.label AS label,
            e.id AS encounter,
            e.external_id as encounter_external_id,
            p.allow_secondary,
            max(e.updated_at) as last_updated_at,
            p.patient_ulid,
            p.enable_chat,
            upm.notification_level
        FROM patients p 
        LEFT JOIN encounters e ON e.patient_id=p.id
        LEFT JOIN locations l ON p.location_id=l.id
        INNER JOIN users_patients_mapping upm ON upm.patient_id=p.id
        WHERE ((p.id = $1 OR p.external_id = $3) OR e.external_id = $3) AND p.tenant_id = $2 and e.ended_at IS null and upm.user_id=$4 and upm.deleted = false
        GROUP BY p.id, l.id, e.id, upm.notification_level
        ORDER BY e.updated_at DESC        
        LIMIT 1;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(patientQuery, [id, tenantId, externalId, userId]);

    if (!result.rowCount) {
        logger.info({metadata: {tenantId, patientId: id}}, 'No patient was found');
        return null;
    }

    const row = result.rows[0];
    return createPatientTemplate({
        id: row.id,
        externalId: row.external_id,
        externalIdType: row.external_id_type,
        firstName: row.first_name,
        lastName: row.last_name,
        dateOfBirth: dateFromIsoTimestamp(row.date_of_birth),
        location: createLocationTemplate({
            id: row.location,
            label: row.label
        }),
        encounterId: row.encounter,
        lastEncounterId: row.encounter,
        allowSecondaryFamilyMembers: row.allow_secondary,
        lastUpdatedAt: row.last_updated_at ? new Date(row.last_updated_at).toISOString() : null,
        patientUlid: row.patient_ulid,
        enableChat: row.enable_chat,
        notificationLevel: row.notification_level
    });
}

module.exports = {
    assignUserToPatient,
    enrollPatient,
    unenrollPatientsById,
    getPatientById,
    getPatientByIdAndEncounter,
    updatePatient,
    getPatientsByUser,
    getPatientByEncounterId,
    getLocationIdByEncounterId,
    getPatientByCdrId,
    addEncounterToPatient,
    getLocationIdByPatientId,
    updatePatientAllowSecondary,
    getPatientsWithClosedEncounters,
    isAllowSecondaryFamilyMemberForPatient,
    updatePatientExternalId,
    getAllPatientsIdsByUser,
    getPatientActiveEncountersById,
    addPatientChatChannelInformation,
    updateChatEnabledToPatient,
    getPatientsWithChatChannelLinkedToUser,
    getPatientIdFromUlid,
    getPatientsByUlids,
    getPatientChatInformationByIdAndUserId
};
