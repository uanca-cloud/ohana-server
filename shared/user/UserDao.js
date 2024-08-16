const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER, ADMINISTRATOR},
        FAMILY_MEMBER_EULA_LAST_CHANGED_DATE,
        CAREGIVER_EULA_LAST_CHANGED_DATE
    } = require('../constants'),
    {
        createCaregiverTemplate,
        createFamilyMemberTemplate,
        createUserTemplate
    } = require('../EntitiesFactory'),
    {getLogger} = require('../logs/LoggingService'),
    {getInvitedByUser} = require('./UserDaoHelper'),
    {differenceInMilliseconds} = require('date-fns');

const logger = getLogger('UserDao');

/**
 * @typedef {Object} User
 * @property {string} userId
 * @property {string} tenantId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} assigned_roles
 * @property {string} title
 */

async function getCaregiversByPatientId(patientId) {
    logger.debug('Getting caregivers by patient id...');
    const queryText = `
        SELECT users.user_id,
          users.tenant_id,
          users.assigned_roles,
          users.first_name,
          users.last_name,
          users.title,
          users.last_eula_acceptance_timestamp
        FROM users
        LEFT JOIN users_patients_mapping ON users.user_id = users_patients_mapping.user_id
        LEFT JOIN encounters ON users_patients_mapping.encounter_id = encounters.id  
        WHERE users_patients_mapping.deleted = false 
          AND users.deleted = false 
          AND encounters.patient_id = $1 
          AND users.assigned_roles @> ARRAY[$2]
          AND encounters.ended_at IS null
        GROUP BY users.user_id;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId, CAREGIVER]);

    if (result.rows.length === 0) {
        logger.info({metadata: {patientId}}, 'No caregivers were found');
        return [];
    }

    return result.rows.map((element) => {
        return createCaregiverTemplate({
            id: element.user_id,
            tenant: {
                id: element.tenant_id
            },
            assignedRoles: element.assigned_roles,
            role: CAREGIVER,
            title: element.title,
            firstName: element.first_name,
            lastName: element.last_name,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(element.last_eula_acceptance_timestamp),
                    new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!element.last_eula_acceptance_timestamp
        });
    });
}

/**
 *
 * @param patientId
 * @returns {Promise<{familyMembers, encounterId: *}|*[]>}
 */

async function getFamilyMembersByPatientId(patientId) {
    logger.debug('Getting family members by patient id...');

    const queryText = `
        SELECT 
          users.user_id,
          users.tenant_id,
          users.assigned_roles,
          encounters.id as encounter_id,
          fi.phone_number,
          fi.patient_relationship,
          fi.preferred_locale,
          fi.is_primary,
          fi.invited_by,
          fi.created_at,
          fi.is_patient,
          users.first_name,
          users.last_name,
          users.last_eula_acceptance_timestamp,
          invited_users.first_name as invited_by_user_first_name,
          invited_users.last_name as invited_by_user_last_name,
          invited_users.tenant_id as invited_by_user_tenant_id,
          invited_users.user_id as invited_by_user_id,
          invited_users.title as invited_by_user_title,
          invited_users.last_eula_acceptance_timestamp as invited_by_last_eula_acceptance_timestamp,
          invited_family_identities.phone_number as invited_by_phone_number,
          invited_users.assigned_roles as invited_by_user_assigned_roles,
          CASE
            WHEN (invited_users.assigned_roles @> ARRAY[$2]) THEN $2
            WHEN (invited_users.assigned_roles @> ARRAY[$3]) THEN $3
          END as invited_by_user_role
        FROM users
        LEFT JOIN users_patients_mapping ON users.user_id = users_patients_mapping.user_id
        LEFT JOIN patients ON users_patients_mapping.patient_id = patients.id 
        LEFT JOIN encounters ON users_patients_mapping.encounter_id = encounters.id  
        LEFT JOIN family_identities fi ON users.user_id = fi.user_id
        LEFT JOIN users invited_users ON fi.invited_by = invited_users.user_id
        LEFT JOIN family_identities invited_family_identities ON invited_family_identities.user_id = invited_users.user_id
        WHERE users_patients_mapping.deleted = false 
          AND patients.id = $1 
          AND users.assigned_roles @> ARRAY[$2]
          AND encounters.ended_at IS NULL 
          AND users.deleted = false;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId, FAMILY_MEMBER, CAREGIVER]);

    if (result.rows.length === 0) {
        logger.info({metadata: {patientId}}, 'No family members were found');
        return [];
    }

    return result.rows.map((element) => {
        return createFamilyMemberTemplate({
            id: element.user_id,
            tenant: {
                id: element.tenant_id
            },
            assignedRoles: element.assigned_roles,
            role: FAMILY_MEMBER,
            firstName: element.first_name,
            lastName: element.last_name,
            phoneNumber: element.phone_number,
            patientRelationship: element.patient_relationship,
            preferredLocale: element.preferred_locale,
            primary: element.is_primary,
            invitedBy: getInvitedByUser(element),
            createdAt: element.created_at,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(element.last_eula_acceptance_timestamp),
                    new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!element.last_eula_acceptance_timestamp,
            isPatient: element.is_patient
        });
    });
}

/**
 *
 * @param user User
 * @returns {Promise<*>}
 */
async function upsertCaregiverUser(user) {
    const {userId, tenantId, firstName, lastName, title, email, assignedRoles} = user;

    const queryText = `
        INSERT INTO 
          users (user_id, tenant_id, first_name, last_name, title, email, assigned_roles) 
          VALUES($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(user_id) DO UPDATE 
        SET
          tenant_id = $2,
          first_name = $3,
          last_name = $4,
          title = $5,
          email = $6,
          assigned_roles = $7
        WHERE users.user_id = $1 
          AND users.deleted = false;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return await pool.query(queryText, [
        userId,
        tenantId,
        firstName,
        lastName,
        title,
        email,
        assignedRoles
    ]);
}

/**
 *
 * @param user User
 * @returns {Promise<*>}
 */
async function upsertAdminUser(user) {
    const {userId, tenantId, firstName, lastName, assignedRoles} = user;

    const queryText = `
        INSERT INTO 
          users (user_id, tenant_id, first_name, last_name, assigned_roles) 
          VALUES($1, $2, $3, $4, $5)
        ON CONFLICT(user_id) DO UPDATE 
        SET
          tenant_id = $2,
          first_name = $3,
          last_name = $4,
          assigned_roles = $5
        WHERE users.user_id = $1 
          AND users.deleted = false;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return await pool.query(queryText, [userId, tenantId, firstName, lastName, assignedRoles]);
}

/**
 *
 * @param dbClient Object
 * @param userId String
 * @param firstName String
 * @param lastName String
 * @returns {Promise<*>}
 */
async function updateFamilyMemberUser(userId, firstName, lastName, dbClient) {
    const queryText = `
    UPDATE users 
    SET
      first_name = $1,
      last_name = $2 
    WHERE user_id = $3 
      AND deleted = false;`;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return client.query(queryText, [firstName, lastName, userId]);
}

/**
 *
 * @param userId String
 * @returns {Promise<*>}
 */
async function updateUserEULAAcceptanceDate(userId) {
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const lastEulaAcceptanceTimestamp = new Date().toISOString();

    const queryText = `
        UPDATE users 
        SET
          last_eula_acceptance_timestamp = $1
        WHERE user_id = $2 
          AND deleted = false;`;

    const result = await pool.query(queryText, [lastEulaAcceptanceTimestamp, userId]);

    if (!result.rowCount) {
        logger.info({metadata: {userId}}, 'No users exists');
        return false;
    }

    return lastEulaAcceptanceTimestamp;
}

/**
 * @param userId String
 * @returns {Promise<*>}
 */
async function getCaregiverByUserId(userId) {
    logger.debug('Getting caregivers by user id...');
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    let result;

    const queryText = `
        SELECT user_id,
          tenant_id,
          assigned_roles,
          first_name,
          last_name,
          title,
          last_eula_acceptance_timestamp
        FROM users
        WHERE users.user_id = $1
          AND assigned_roles @> ARRAY[$2]
        LIMIT 1
    `;
    result = await pool.query(queryText, [userId, CAREGIVER]);

    if (result.rows.length === 0) {
        logger.info({metadata: {userId}}, 'No users were found');
        return null;
    }

    const acceptedEula =
        differenceInMilliseconds(
            new Date(result.rows[0].last_eula_acceptance_timestamp),
            new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
        ) >= 0;

    return {
        id: result.rows[0].user_id,
        tenant: {
            id: result.rows[0].tenant_id
        },
        title: result.rows[0].title,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        acceptedEula,
        renewEula: !!result.rows[0].last_eula_acceptance_timestamp,
        eulaAcceptTimestamp: result.rows[0].last_eula_acceptance_timestamp,
        assignedRoles: result.rows[0].assigned_roles
    };
}

/**
 *
 * @param dbClient Object
 * @param userId String
 * @param tenantId String
 * @returns {Promise<*>}
 */
async function createFamilyMemberUser(userId, tenantId, dbClient) {
    logger.debug('Creating family member...');
    const query = `
        INSERT INTO users (
            user_id,
            tenant_id,
            assigned_roles
        ) 
        VALUES($1,$2,$3) 
        RETURNING user_id;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return await client.query(query, [userId, tenantId, [FAMILY_MEMBER]]);
}

async function removeUser(userId, dbClient) {
    logger.debug('Removing user...');
    const deleteUser = `
        UPDATE users 
        SET deleted = true 
        WHERE user_id = $1;
    `;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    try {
        await client.query(deleteUser, [userId]);
        return true;
    } catch (error) {
        logger.error({error}, 'Error occurred when removing user!');
        return false;
    }
}

async function cleanupUsersByIds(users, dbClient) {
    logger.debug('Cleaning up users...');

    const cleanupUsers = `
        DELETE FROM users 
        WHERE user_id = ANY($1)
    `;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    try {
        await client.query(cleanupUsers, [users]);
        return true;
    } catch (error) {
        logger.error({error}, 'Error occurred when cleaning up users!');
        return false;
    }
}

/**
 *
 * @param patientId string
 * @param tenantId string
 * @returns {Promise<null|*>}
 */
async function getFamilyMemberDevices(patientId, tenantId) {
    logger.debug('Getting family member devices...');

    const queryText = `
        SELECT u.user_id,
          u.tenant_id,
          u.assigned_roles,
          u.first_name,
          u.last_name,
          u.last_eula_acceptance_timestamp,
          di.device_id,
          di.notification_platform, 
          di.device_token, 
          di.iv, 
          di.partial_key,
          di.app_version,
          fi.phone_number,
          fi.is_primary,
          fi.patient_relationship,
          fi.preferred_locale,
          fi.is_patient
        FROM patients p 
        INNER JOIN users_patients_mapping upm ON p.id=upm.patient_id
        INNER JOIN users u ON u.user_id=upm.user_id
        INNER JOIN device_info di ON di.user_id=upm.user_id
        INNER JOIN family_identities fi ON u.user_id = fi.user_id
        WHERE upm.patient_id = $1 
          AND u.tenant_id = $2 
          AND u.assigned_roles @> ARRAY[$3]
          AND di.notification_platform IS NOT NULL 
          AND u.deleted = false 
          AND upm.deleted = false
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(queryText, [patientId, tenantId, FAMILY_MEMBER]);

    if (!result.rowCount) {
        logger.info({metadata: {patientId, tenantId}}, 'No family member devices were found');
        return [];
    }

    return result.rows.map((element) =>
        createFamilyMemberTemplate({
            id: element.user_id,
            tenant: {
                id: element.tenant_id
            },
            assigned_roles: element.assigned_roles,
            firstName: element.first_name,
            lastName: element.last_name,
            phoneNumber: element.phone_number,
            patientRelationship: element.patient_relationship,
            preferredLocale: element.preferred_locale,
            notificationPlatform: element.notification_platform,
            iv: element.iv,
            partialKey: element.partial_key,
            deviceToken: element.device_token,
            primary: element.is_primary,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(element.last_eula_acceptance_timestamp),
                    new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!element.last_eula_acceptance_timestamp,
            isPatient: element.is_patient,
            deviceId: element.device_id,
            appVersion: element.app_version
        })
    );
}

async function getFamilyMembersWithDevicesByPatientIds(patientIds) {
    logger.debug('Getting family member devices by patient ids...');

    const queryText = `
        SELECT u.user_id,
          u.tenant_id,
          u.assigned_roles,
          u.first_name,
          u.last_name,
          u.last_eula_acceptance_timestamp,
          di.notification_platform, 
          di.device_token, 
          di.iv, 
          di.partial_key,
          di.app_version,
          di.registration_id,
          fi.phone_number,
          fi.is_primary,
          fi.patient_relationship,
          fi.preferred_locale,
          fi.is_patient,
          p.patient_ulid,
          p.id
        FROM patients p 
        INNER JOIN users_patients_mapping upm ON p.id=upm.patient_id
        INNER JOIN users u ON u.user_id=upm.user_id
        INNER JOIN device_info di ON di.user_id=upm.user_id
        INNER JOIN family_identities fi ON u.user_id = fi.user_id
        WHERE upm.patient_id = ANY($1) 
          AND u.assigned_roles @> ARRAY[$2]
          AND di.notification_platform IS NOT NULL
          AND u.deleted = false 
          AND upm.deleted = false;
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(queryText, [patientIds, FAMILY_MEMBER]);

    if (!result.rowCount) {
        logger.info({metadata: {patientIds}}, 'No family member devices were found');
        return null;
    }

    return result.rows.map((element) =>
        createFamilyMemberTemplate({
            id: element.user_id,
            tenant: {
                id: element.tenant_id
            },
            assigned_roles: element.assigned_roles,
            firstName: element.first_name,
            lastName: element.last_name,
            phoneNumber: element.phone_number,
            patientRelationship: element.patient_relationship,
            preferredLocale: element.preferred_locale,
            notificationPlatform: element.notification_platform,
            iv: element.iv,
            partialKey: element.partial_key,
            deviceToken: element.device_token,
            primary: element.is_primary,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(element.last_eula_acceptance_timestamp),
                    new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!element.last_eula_acceptance_timestamp,
            isPatient: element.is_patient,
            deviceId: element.device_id,
            patientUlid: element.patient_ulid,
            appVersion: element.app_version,
            registrationId: element.registration_id,
            patientId: element.id
        })
    );
}

async function getUserByUserId(userId) {
    logger.debug('Getting users by user id...');
    const queryText = `
        SELECT u.user_id,
          u.tenant_id,
          u.assigned_roles,
          u.first_name,
          u.last_name,
          u.title,
          u.last_eula_acceptance_timestamp,
          u.email,
          fi.phone_number,
          fi.is_primary,
          fi.patient_relationship,
          fi.preferred_locale,
          fi.is_patient
        FROM users u
        LEFT JOIN family_identities fi ON fi.user_id = u.user_id
        WHERE u.user_id = $1 
          AND deleted = false
        LIMIT 1;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [userId]);

    if (result.rows.length === 0) {
        logger.info({metadata: {userId}}, 'No users were found');
        return null;
    }

    const row = result.rows[0];

    let user = createUserTemplate({
        id: row.user_id,
        tenant: {
            id: row.tenant_id
        },
        firstName: row.first_name,
        lastName: row.last_name,
        assignedRoles: row.assigned_roles,
        role: row.assigned_roles.includes(FAMILY_MEMBER) ? FAMILY_MEMBER : CAREGIVER
    });
    if (user.assignedRoles.includes(CAREGIVER)) {
        user = createCaregiverTemplate({
            ...user,
            title: row.title,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(row.last_eula_acceptance_timestamp),
                    new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!row.last_eula_acceptance_timestamp,
            email: row.email
        });
    } else if (user.assignedRoles.includes(FAMILY_MEMBER)) {
        user = createFamilyMemberTemplate({
            ...user,
            phoneNumber: row.phone_number,
            patientRelationship: row.patient_relationship,
            preferredLocale: row.preferred_locale,
            primary: row.is_primary,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(row.last_eula_acceptance_timestamp),
                    new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!row.last_eula_acceptance_timestamp,
            isPatient: row.is_patient
        });
    }

    return user;
}

async function sharesPatientsMapping(firstUserId, secondUserId, patientId) {
    logger.debug('Checking if users are mapped by a patient');
    const queryText = `
        SELECT COUNT(*)
        FROM users_patients_mapping
        WHERE user_id = $1
          AND patient_id = $2
          AND deleted = false;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const firstUserMapping = await pool.query(queryText, [firstUserId, patientId]);

    if (secondUserId) {
        const secondUserMapping = await pool.query(queryText, [secondUserId, patientId]);
        return firstUserMapping?.rows[0]?.count > 0 && secondUserMapping.rows[0]?.count > 0;
    }

    return firstUserMapping?.rows[0]?.count > 0;
}

/**
 * @param patientId String
 * @typedef {Object} User
 **/
async function getCaregiversByPatientIdWithClosedEncounters(patientId) {
    logger.debug('Getting caregivers by patient id...');
    const queryText = `
        SELECT users.user_id,
          users.tenant_id,
          users.assigned_roles,
          users.first_name,
          users.last_name,
          users.title,
          users.last_eula_acceptance_timestamp
        FROM users
        LEFT JOIN users_patients_mapping ON users.user_id = users_patients_mapping.user_id
        LEFT JOIN encounters ON users_patients_mapping.encounter_id = encounters.id  
        WHERE users_patients_mapping.deleted = false 
          AND users.deleted = false 
          AND encounters.patient_id = $1 
          AND users.assigned_roles @> ARRAY[$2]
          AND encounters.ended_at IS NOT null
        GROUP BY users.user_id;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId, CAREGIVER]);

    if (result.rows.length === 0) {
        logger.info({metadata: {patientId}}, 'No caregivers were found');
        return [];
    }

    return result.rows.map((element) => {
        return createCaregiverTemplate({
            id: element.user_id,
            tenant: {
                id: element.tenant_id
            },
            assigned_roles: element.assigned_roles,
            title: element.title,
            firstName: element.first_name,
            lastName: element.last_name,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(element.last_eula_acceptance_timestamp),
                    new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!element.last_eula_acceptance_timestamp
        });
    });
}

/**
 *
 * @param locationId
 * @returns {Promise<{userId: *, deviceId: *}[]|*[]>}
 */
async function getUsersByLocationId(locationId) {
    logger.debug('Getting users by location id...');

    const queryText = `
        SELECT u.user_id, di.device_id
        FROM users u
        JOIN users_patients_mapping upm ON upm.user_id = u.user_id
        JOIN patients p ON p.id = upm.patient_id
        JOIN device_info di ON di.user_id = u.user_id
        WHERE p.location_id = $1
            AND upm.deleted = false 
            AND u.deleted = false 
        GROUP BY u.user_id, di.device_id;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [locationId]);

    if (result.rows.length === 0) {
        return [];
    }

    return result.rows.map((row) => ({userId: row.user_id, deviceId: row.device_id}));
}

/**
 *
 * @param patientId string
 * @param tenantId string
 * @returns {Promise<null|*>}
 */
async function getUserIdsLinkedToPatient(patientId, tenantId) {
    logger.debug('Getting ids for all users linked to a patient...');
    const queryText = `
         SELECT users.user_id,
            users.assigned_roles
        FROM users
        LEFT JOIN users_patients_mapping ON users.user_id = users_patients_mapping.user_id
        WHERE users_patients_mapping.deleted = false 
          AND users.deleted = false 
          AND users_patients_mapping.patient_id = $1
          AND users.tenant_id = $2
        GROUP BY users.user_id;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId, tenantId]);

    if (result.rows.length === 0) {
        logger.info({metadata: {patientId}}, 'No users were found');
        return [];
    }

    return result.rows.map((element) => {
        return createCaregiverTemplate({
            id: element.user_id,
            role: element.assigned_roles.includes(FAMILY_MEMBER)
                ? FAMILY_MEMBER
                : element.assigned_roles.includes(CAREGIVER)
                ? CAREGIVER
                : ADMINISTRATOR
        });
    });
}

async function getChatUserInfoById(userId) {
    logger.debug('Getting chat user info by user id...');
    const queryText = `
         SELECT u.first_name,
             u.last_name,
             u.assigned_roles,
             u.title,
             fi.patient_relationship
        FROM users u
        LEFT JOIN family_identities fi ON u.user_id = fi.user_id
        WHERE u.user_id = $1;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [userId]);

    if (!result.rowCount) {
        logger.info({metadata: {userId}}, 'No users were found');
        return null;
    }

    let user = createUserTemplate({
        id: userId,
        role: result.rows[0].assigned_roles.includes(FAMILY_MEMBER) ? FAMILY_MEMBER : CAREGIVER,
        assignedRoles: result.rows[0].assigned_roles,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name
    });

    if (user.assignedRoles.includes(CAREGIVER)) {
        user = createCaregiverTemplate({
            ...user,
            title: result.rows[0].title
        });
    } else if (user.assignedRoles.includes(FAMILY_MEMBER)) {
        user = createFamilyMemberTemplate({
            ...user,
            patientRelationship: result.rows[0].patient_relationship
        });
    }

    return user;
}

/**
 * @param patientId String
 * @param senderDeviceId String
 * @typedef {Object} User
 **/
async function getUsersAndDevicesByPatientId(patientId, senderDeviceId) {
    logger.debug('Getting users with devices by patient id...');
    const queryText = `
        SELECT users.user_id,
          di.device_id
        FROM users
        LEFT JOIN users_patients_mapping ON users.user_id = users_patients_mapping.user_id
        JOIN patients ON users_patients_mapping.patient_id = patients.id  
        JOIN encounters ON patients.id = encounters.patient_id  
        JOIN device_info di ON di.user_id = users.user_id
        WHERE users_patients_mapping.deleted = false 
          AND users.deleted = false 
          AND users_patients_mapping.patient_id = $1
          AND encounters.ended_at IS null
          AND di.device_id <> $2
        GROUP BY users.user_id, di.device_id;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(queryText, [patientId, senderDeviceId]);

    if (result.rows.length === 0) {
        logger.info({metadata: {patientId}}, 'No users were found');
        return [];
    }

    return result.rows.map((row) => ({userId: row.user_id, deviceId: row.device_id}));
}

/**
 * @param userIds String[]
 * @returns {Promise<{id: String, firstName: String, lastName: String, assignedRoles: String[], role: String}[]>}
 */
async function getUsersByIds(userIds) {
    logger.debug('Getting user data by user ids');
    const usersQuery = `
        SELECT
            u.user_id,
            u.first_name,
            u.last_name,
            u.assigned_roles,
            u.title,
            fi.patient_relationship
        FROM users u
        LEFT JOIN family_identities fi ON u.user_id = fi.user_id 
        WHERE u.user_id = ANY ($1::text[])
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const result = await client.query(usersQuery, [userIds]);

    if (result.rows.length === 0) {
        logger.info('No users were found');
        return [];
    }

    return result.rows.map((element) => {
        let user = createUserTemplate({
            id: element.user_id,
            role: element.assigned_roles.includes(FAMILY_MEMBER)
                ? FAMILY_MEMBER
                : element.assigned_roles.includes(CAREGIVER)
                ? CAREGIVER
                : ADMINISTRATOR,
            assignedRoles: element.assigned_roles,
            firstName: element.first_name,
            lastName: element.last_name
        });
        if (user.assignedRoles.includes(CAREGIVER)) {
            user = createCaregiverTemplate({
                ...user,
                title: element.title
            });
        } else if (user.assignedRoles.includes(FAMILY_MEMBER)) {
            user = createFamilyMemberTemplate({
                ...user,
                patientRelationship: element.patient_relationship
            });
        }

        return user;
    });
}

/**
 * @param userId String
 * @param patientId String
 * @param notificationLevel String
 * @returns {Promise<*>}
 */
async function updateChatNotificationLevelForUser(userId, patientId, notificationLevel) {
    logger.debug('Updating chat notification level for user...');
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const usersQuery = `
        UPDATE users_patients_mapping 
        SET
          notification_level = $1 
        WHERE user_id = $2 
          AND patient_id = $3
          AND deleted = false;
        `;

    return client.query(usersQuery, [notificationLevel, userId, patientId]);
}

module.exports = {
    getCaregiversByPatientId,
    getFamilyMemberDevices,
    getFamilyMembersByPatientId,
    upsertCaregiverUser,
    upsertAdminUser,
    updateFamilyMemberUser,
    createFamilyMemberUser,
    removeUser,
    cleanupUsersByIds,
    updateUserEULAAcceptanceDate,
    getCaregiverByUserId,
    getUserByUserId,
    sharesPatientsMapping,
    getFamilyMembersWithDevicesByPatientIds,
    getCaregiversByPatientIdWithClosedEncounters,
    getUsersByLocationId,
    getUserIdsLinkedToPatient,
    getChatUserInfoById,
    getUsersAndDevicesByPatientId,
    getUsersByIds,
    updateChatNotificationLevelForUser
};
