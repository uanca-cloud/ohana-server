const {runWithTransaction} = require('../DaoHelper'),
    {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        createUserPatientMapping,
        removeUserPatientMapping,
        removeUserPatientMappingsByUserIds
    } = require('../patient/UserPatientMappingDao'),
    {
        createFamilyMemberUser,
        updateFamilyMemberUser,
        removeUser,
        cleanupUsersByIds
    } = require('../user/UserDao'),
    {createFamilyMemberIdentityTemplate} = require('../EntitiesFactory'),
    {removeDeviceInfo, removeDeviceInfoByPatientId} = require('../device/DeviceInfoDao'),
    {updateEncounters} = require('../patient/EncounterDao'),
    {v4: uuid} = require('uuid'),
    {
        DB_CONNECTION_POOLS,
        FAMILY_MEMBER_EULA_LAST_CHANGED_DATE,
        OHANA_ROLES: {FAMILY_MEMBER, CAREGIVER}
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    {getInvitedByUser} = require('../user/UserDaoHelper'),
    {removeUpdateByIds} = require('../updates/UpdatesDao'),
    {removeUserJoinAttachmentByUserIds} = require('../updates/AttachmentsDao'),
    {differenceInMilliseconds} = require('date-fns'),
    {removeUserJoinUpdatesByPatientId} = require('../updates/UpdatesHelper');

const logger = getLogger('FamilyIdentityDao');

async function createFamilyMemberIdentity(
    dbClient,
    userId,
    patientId,
    phoneNumber,
    publicKey,
    invitedBy,
    isPrimary
) {
    logger.debug('Creating family member identity...');

    const query = `
        INSERT INTO family_identities 
            (user_id,
            patient_id,
            phone_number,
            public_key,
            invited_by,
            is_primary,
            created_at,
            is_patient) 
        VALUES($1,$2,$3,$4,$5, $6, $7, $8) 
        RETURNING user_id;`;

    return dbClient.query(query, [
        userId,
        patientId,
        phoneNumber,
        publicKey,
        invitedBy,
        isPrimary,
        new Date(),
        false
    ]);
}

async function getFamilyMemberIdentity(userId, dbClient) {
    logger.debug('Getting family member identity...');

    const query = `
        SELECT fi.user_id, 
          fi.patient_id,
          fi.public_key,
          fi.is_primary,
          fi.invited_by,
          fi.created_at,
          fi.is_patient,
          users.first_name as invited_by_user_first_name,
          users.last_name as invited_by_user_last_name,
          users.tenant_id as invited_by_user_tenant_id,
          users.user_id as invited_by_user_id,
          users.title as invited_by_user_title,
          users.last_eula_acceptance_timestamp as invited_by_last_eula_acceptance_timestamp,
          invited_by_family_identities.phone_number as invited_by_phone_number,
          CASE
            WHEN (users.assigned_roles @> ARRAY[$2]) THEN $2
            WHEN (users.assigned_roles @> ARRAY[$3]) THEN $3
          END as invited_by_user_role
        FROM family_identities fi 
        LEFT OUTER JOIN users ON users.user_id = fi.user_id
        LEFT OUTER JOIN family_identities invited_by_family_identities ON invited_by_family_identities.user_id = users.user_id
        WHERE fi.user_id = $1 AND users.deleted = false;`;

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [userId, FAMILY_MEMBER, CAREGIVER]);

    if (!result.rowCount) {
        logger.info({metadata: {userId}}, 'No family member identity found');
        return null;
    }

    return createFamilyMemberIdentityTemplate({
        publicKey: result.rows[0].public_key,
        userId: result.rows[0].user_id,
        patientId: result.rows[0].patient_id,
        primary: !!result.rows[0].is_primary,
        invitedBy: getInvitedByUser(result.rows[0]),
        createdAt: result.rows[0].created_at,
        isPatient: !!result.rows[0].is_patient
    });
}

async function getFamilyMember(userId) {
    logger.debug('Getting family member by user id...');
    const query = `
        SELECT 
          fi.public_key, 
          users.tenant_id, 
          users.assigned_roles,
          fi.phone_number,
          fi.patient_relationship,
          fi.preferred_locale,
          fi.patient_id,
          fi.is_primary,
          fi.is_patient,
          users.first_name,
          users.last_name,
          users.last_eula_acceptance_timestamp,
          fi.invited_by,
          fi.created_at,
          invited_users.first_name as invited_by_user_first_name,
          invited_users.last_name as invited_by_user_last_name,
          invited_users.tenant_id as invited_by_user_tenant_id,
          invited_users.user_id as invited_by_user_id,
          invited_users.title as invited_by_user_title,
          invited_users.last_eula_acceptance_timestamp as invited_by_last_eula_acceptance_timestamp,
          invited_family_identities.phone_number as invited_by_phone_number,
          CASE
            WHEN (invited_users.assigned_roles @> ARRAY[$2]) THEN $2
            WHEN (invited_users.assigned_roles @> ARRAY[$3]) THEN $3
          END as invited_by_user_role
        FROM family_identities as fi
        LEFT JOIN users ON fi.user_id = users.user_id
        LEFT JOIN users invited_users ON fi.invited_by = invited_users.user_id
        LEFT JOIN family_identities invited_family_identities ON invited_users.user_id = invited_family_identities.user_id 
        WHERE fi.user_id = $1 AND users.deleted = false;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [userId, FAMILY_MEMBER, CAREGIVER]);

    if (!result.rowCount) {
        logger.info({metadata: {userId}}, 'No family member identity found');
        return null;
    }

    return {
        userId,
        patientId: result.rows[0].patient_id,
        tenantId: result.rows[0].tenant_id,
        assignedRoles: result.rows[0].assigned_roles,
        role: result.rows[0].assigned_roles.includes(FAMILY_MEMBER) ? FAMILY_MEMBER : CAREGIVER,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        phoneNumber: result.rows[0].phone_number,
        patientRelationship: result.rows[0].patient_relationship,
        preferredLocale: result.rows[0].preferred_locale,
        primary: !!result.rows[0].is_primary,
        invitedBy: getInvitedByUser(result.rows[0]),
        createdAt: result.rows[0].created_at,
        acceptedEula:
            differenceInMilliseconds(
                new Date(result.rows[0].last_eula_acceptance_timestamp),
                new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
            ) >= 0,
        eulaAcceptTimestamp: result.rows[0].last_eula_acceptance_timestamp,
        mappedPatients: [result.rows[0].patient_id],
        isPatient: !!result.rows[0].is_patient
    };
}

async function updateFamilyMemberIdentity(
    dbClient,
    phoneNumber,
    patientRelationship,
    preferredLocale,
    userId,
    primary,
    hasPatientRelationship
) {
    logger.debug('Updating family member identity...');
    const query = `
        UPDATE family_identities 
        SET
          phone_number = $1,    
          patient_relationship = $2,
          preferred_locale = $3,
          is_patient = $4,
          is_primary = $5
        WHERE user_id = $6;`;

    return dbClient.query(query, [
        phoneNumber,
        patientRelationship,
        preferredLocale,
        hasPatientRelationship,
        hasPatientRelationship || primary,
        userId
    ]);
}

async function updateFamilyMember(familyMember) {
    logger.debug('Updating family member...');
    const {
        firstName,
        lastName,
        phoneNumber,
        patientRelationship,
        preferredLocale,
        userId,
        primary,
        hasPatientRelationship
    } = familyMember;
    try {
        await runWithTransaction(async (dbClient) => {
            await updateFamilyMemberIdentity(
                dbClient,
                phoneNumber,
                patientRelationship,
                preferredLocale,
                userId,
                primary,
                hasPatientRelationship
            );
            await updateFamilyMemberUser(userId, firstName, lastName, dbClient);
        });
    } catch (error) {
        logger.error({error}, 'Error occurred when updating a family member!');
        return false;
    }
    return true;
}

async function createFamilyIdentity(entry, publicKey) {
    logger.debug('Creating family member identity...');
    const {tenantId, patientId, phoneNumber = null, invitedBy, isPrimary} = entry;
    let userId = null;

    await runWithTransaction(async (dbClient) => {
        userId = uuid();
        await updateEncounters({patientId}, dbClient);
        await createFamilyMemberUser(userId, tenantId, dbClient);
        await createFamilyMemberIdentity(
            dbClient,
            userId,
            patientId,
            phoneNumber,
            publicKey,
            invitedBy,
            isPrimary
        );
        await createUserPatientMapping(
            {
                patientId,
                userId,
                encounterId: null
            },
            dbClient
        );
    });

    return userId;
}

async function removeIdentity(userId, dbClient) {
    logger.debug('Removing family member identity...');
    const deleteIdentity = `DELETE FROM family_identities WHERE user_id = $1;`;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    try {
        await client.query(deleteIdentity, [userId]);
        return true;
    } catch (error) {
        logger.error({error}, 'Error occurred when removing family member identity!');
        return false;
    }
}

async function removeIdentitiesByPatientId(patientId, dbClient) {
    logger.debug('Removing FM identities by patient id...');
    const query = `
        DELETE FROM family_identities
        WHERE patient_id = $1;
    `;

    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await client.query(query, [patientId]);
}

/**
 * Soft delete users so we still have access to their info for read receipts
 * Remove device, user join updates, family identities
 * @param userId
 * @param patientId
 * @param {boolean} removeUserJoinUpdates
 * @returns {Promise<boolean>}
 */
async function removeFamilyMember(userId, patientId, removeUserJoinUpdates) {
    logger.debug('Removing family member...');
    try {
        await runWithTransaction(async (dbClient) => {
            await updateEncounters({patientId}, dbClient);
            await removeDeviceInfo(userId, dbClient);

            if (removeUserJoinUpdates) {
                const updateIds = await removeUserJoinAttachmentByUserIds([userId], dbClient);
                await removeUpdateByIds(updateIds, dbClient);
            }

            await removeUserPatientMapping(userId, dbClient);
            await removeIdentity(userId, dbClient);
            await removeUser(userId, dbClient);
        });
        return true;
    } catch (error) {
        logger.error({error}, 'Error occurred when removing a family member!');
        return false;
    }
}

/**
 * Batch remove users with all their related data
 * @param dbClient
 * @param patientId
 * @param userIds
 * @returns {Promise<boolean>}
 */
async function removeFamilyMembersByPatientId(patientId, userIds, dbClient) {
    logger.debug('Removing family members...');
    // order of operations matters here
    await removeDeviceInfoByPatientId(patientId, dbClient);
    await removeUserJoinUpdatesByPatientId(patientId, dbClient);
    // we should not pass the CG ids to this function, we have a different cron for that operation
    await removeUserPatientMappingsByUserIds(userIds, dbClient);
    await removeIdentitiesByPatientId(patientId, dbClient);
    await cleanupUsersByIds(userIds, dbClient);
}

async function hasPatientUserRegistered(patientId, userId) {
    logger.debug('Checking if patient user has registered...');

    const query = `
        SELECT COUNT(*)
        FROM family_identities as fi
        INNER JOIN users ON fi.user_id = users.user_id 
        INNER JOIN users_patients_mapping upm ON upm.user_id = users.user_id
        WHERE upm.patient_id = $1 AND users.deleted = false AND upm.deleted = false AND fi.is_patient = true AND users.user_id != $2;`;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(query, [patientId, userId]);

    return result?.rows[0]?.count > 0;
}

module.exports = {
    createFamilyIdentity,
    getFamilyMemberIdentity,
    getFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    removeFamilyMembersByPatientId,
    removeIdentitiesByPatientId,
    updateFamilyMemberIdentity,
    hasPatientUserRegistered
};
