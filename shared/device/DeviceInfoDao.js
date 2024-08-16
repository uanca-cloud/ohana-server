const {getDatabasePool} = require('../DatabasePoolFactory'),
    {createDeviceInfoTemplate} = require('../EntitiesFactory'),
    {
        DB_CONNECTION_POOLS,
        OHANA_ROLES: {FAMILY_MEMBER, CAREGIVER}
    } = require('../constants'),
    {getLogger} = require('../logs/LoggingService');

const logger = getLogger('DeviceInfoDao');

/**
 * @typedef {Object} DeviceInfo
 * @property {string} deviceId
 * @property {string} deviceName
 * @property {string} deviceModel
 * @property {string} osVersion
 * @property {string} appVersion
 * @property {string} userId
 * @property {string} iv
 * @property {string} partialKey
 * @property {string} deviceToken
 * @property {string} notificationPlatform
 */

/**
 *
 * @param deviceInfo DeviceInfo
 * @returns {Promise<boolean>}
 */
async function createDevice(deviceInfo) {
    logger.debug('Creating device...');
    let {userId, deviceId, deviceName, osVersion, deviceModel, appVersion} = deviceInfo;
    const insertQueryText = `
        INSERT INTO device_info (
            user_id,
            device_id,
            device_model,
            os_version,
            app_version,
            device_name
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(device_id)
        DO UPDATE SET
        user_id = $1,
        device_model = $3,
        os_version = $4,
        app_version = $5,
        device_name = $6
        WHERE device_info.device_id = $2;
    `;
    deviceName = deviceName ?? null;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    return pool.query(insertQueryText, [
        userId,
        deviceId,
        deviceModel,
        osVersion,
        appVersion,
        deviceName
    ]);
}

async function updateDevicePushNotificationConfig(deviceInfo) {
    logger.debug('Updating device push notification config...');

    let {
        userId,
        iv,
        deviceId,
        deviceName,
        deviceToken,
        notificationPlatform,
        partialKey,
        registrationId
    } = deviceInfo;
    const updateQueryText = `
        UPDATE device_info SET
            iv = $1,    
            device_token = $2,
            notification_platform = $3,
            partial_key = $4,
            device_name = $5,
            registration_id = $8
            WHERE user_id = $6 AND device_id = $7 RETURNING os_version, device_model;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    //set to null if we receive undefined
    deviceName = deviceName ?? null;
    const result = await pool.query(updateQueryText, [
        iv,
        deviceToken,
        notificationPlatform,
        partialKey,
        deviceName,
        userId,
        deviceId,
        registrationId
    ]);

    if (!result.rowCount) {
        logger.info({metadata: {userId, deviceId}}, 'Device id can not be found for this user!');
        return null;
    }

    return createDeviceInfoTemplate({
        userId,
        iv,
        deviceId,
        deviceToken,
        deviceName,
        notificationPlatform,
        osVersion: result.rows[0].os_version,
        deviceModel: result.rows[0].device_model,
        registrationId
    });
}

async function removeDeviceInfo(userId, dbClient) {
    logger.debug('Removing device by user id...');

    const deleteDeviceInfo = `DELETE FROM device_info WHERE user_id = $1;`;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(deleteDeviceInfo, [userId]);
}

async function removeDeviceInfosByUserIds(userIds, dbClient) {
    logger.debug('Removing devices by user ids...');

    const deleteDeviceInfo = `DELETE FROM device_info WHERE user_id = ANY($1);`;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(deleteDeviceInfo, [userIds]);
}

async function removeDeviceInfoByDeviceId(deviceId, userId, dbClient = null) {
    logger.debug('Removing device by device id...');

    const deleteDeviceInfo = `
        DELETE FROM device_info 
        WHERE device_id = $1
            AND user_id = $2;
    `;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(deleteDeviceInfo, [deviceId, userId]);
}

async function removeDeviceInfoByPatientId(patientId, dbClient) {
    logger.debug('Removing device infos by patient id...');
    const deleteQuery = `
        DELETE from device_info di
        USING family_identities fi
        WHERE fi.user_id = di.user_id
            AND fi.patient_id = $1;
    `;

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await pool.query(deleteQuery, [patientId]);
}

async function getDeviceInfo(deviceId) {
    logger.debug('Getting device by device id...');

    const getDeviceInfoQuery = `SELECT device_model, os_version, registration_id FROM device_info WHERE device_id = $1;`;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(getDeviceInfoQuery, [deviceId]);

    if (!result.rowCount) {
        logger.info({metadata: {deviceId}}, 'Device id can not be found!');
        return null;
    }

    return createDeviceInfoTemplate({
        deviceModel: result.rows[0].device_model,
        osVersion: result.rows[0].os_version,
        registrationId: result.rows[0].registration_id
    });
}

async function getDeviceInfoByUserId(userId) {
    logger.debug('Getting device by user id...');
    const getDeviceInfoQuery = `
        SELECT 
                device_id,
                notification_platform, 
                device_token, 
                iv, 
                partial_key,
                device_name,
                app_version,
                registration_id
        FROM device_info WHERE user_id = $1;`;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(getDeviceInfoQuery, [userId]);

    if (!result.rowCount) {
        logger.info({metadata: {userId}}, 'No device found for this user id!');
        return null;
    }

    return createDeviceInfoTemplate({
        deviceId: result.rows[0].device_id,
        deviceToken: result.rows[0].device_token,
        iv: result.rows[0].iv,
        notificationPlatform: result.rows[0].notification_platform,
        deviceName: result.rows[0].device_name,
        appVersion: result.rows[0].app_version,
        registrationId: result.rows[0].registration_id
    });
}

async function getDeviceIdsFromUserIds(userIds, senderDeviceId = null) {
    logger.debug('Getting devices by user ids...');
    const variables = [userIds];
    let query = `
        SELECT di.device_id,
            u.user_id
        FROM device_info di
        JOIN users u ON di.user_id = u.user_id
        WHERE u.user_id = ANY($1)
            AND u.deleted = false
    `;

    if (senderDeviceId) {
        query += ' AND di.device_id <> $2;';
        variables.push(senderDeviceId);
    }

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(query, variables);

    if (!result.rowCount) {
        logger.info({metadata: {userIds}}, 'No devices found for users!');
        return null;
    }

    return result.rows.map((row) => ({
        userId: row.user_id,
        deviceId: row.device_id
    }));
}

/**
 * Fetches the device information and notification level settings of the specific user from the database.
 * The result is filtered based on the provided user id(s), patient id, and optionally the sender device id.
 *
 * @async
 * @param {string[]} userIds - An array of user IDs to query.
 * @param {string} patientId - The patient ID to query.
 * @param {string} [senderDeviceId=null] - The sender's device ID. If provided, results will exclude this device ID.
 * @returns {Promise<Array|Null>} - Returns a Promise. When resolved, it will be an array of objects.
 */
async function getDeviceIdsAndNotificationLevelsFromUserIds(
    userIds,
    patientId,
    senderDeviceId = null
) {
    logger.debug('Getting devices with notification level by user ids...');
    const variables = [userIds, patientId];
    let query = `
        SELECT di.device_id,
               di.notification_platform,
               di.app_version,
               u.user_id,
               u.first_name,
               u.last_name,
               u.assigned_roles,
               upm.notification_level
        FROM device_info di
        INNER JOIN users u ON di.user_id = u.user_id
        LEFT JOIN users_patients_mapping AS upm ON upm.user_id = u.user_id
        WHERE u.user_id = ANY($1)
          AND u.first_name IS NOT null
           AND u.last_name IS NOT null
          AND upm.patient_id = $2
          AND u.deleted = false
    `;

    if (senderDeviceId) {
        query += ' AND di.device_id <> $3;';
        variables.push(senderDeviceId);
    }

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(query, variables);

    if (!result.rowCount) {
        logger.info({metadata: {userIds}}, 'No devices found for users!');
        return null;
    }

    return result.rows.map((row) => ({
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        roles: row.assigned_roles,
        role: row.assigned_roles.includes(FAMILY_MEMBER) ? FAMILY_MEMBER : CAREGIVER,
        deviceId: row.device_id,
        notificationPlatform: row.notification_platform,
        appVersion: row.app_version,
        notificationLevel: row.notification_level
    }));
}

async function getUserAndTenantIdsFromDeviceId(deviceId) {
    logger.debug('Getting user and tenant id by device id...');
    const query = `
        SELECT u.user_id,
            u.tenant_id
        FROM device_info di
        JOIN users u ON di.user_id = u.user_id
        WHERE di.device_id = $1
            AND u.deleted = false
        LIMIT 1;
    `;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(query, [deviceId]);

    if (!result.rowCount) {
        logger.info({metadata: {deviceId}}, 'No device found!');
        return null;
    }

    return {
        userId: result.rows[0].user_id,
        tenantId: result.rows[0].tenant_id
    };
}

async function getDeviceInfoForUsers(userIds) {
    const getDeviceInfoQuery = `
        SELECT 
                device_id,
                notification_platform, 
                device_token, 
                iv, 
                partial_key,
                device_name,
                registration_id
        FROM device_info WHERE user_id = ANY($1);`;
    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await client.query(getDeviceInfoQuery, [userIds]);

    if (!result.rowCount) {
        return [];
    }

    return result.rows.map((element) => {
        return createDeviceInfoTemplate({
            deviceId: element.device_id,
            deviceToken: element.device_token,
            iv: element.iv,
            notificationPlatform: element.notification_platform,
            deviceName: element.device_name,
            registrationId: element.registration_id
        });
    });
}

module.exports = {
    createDevice,
    updateDevicePushNotificationConfig,
    removeDeviceInfo,
    getDeviceInfo,
    getDeviceInfoByUserId,
    removeDeviceInfoByPatientId,
    getDeviceIdsFromUserIds,
    removeDeviceInfosByUserIds,
    removeDeviceInfoByDeviceId,
    getUserAndTenantIdsFromDeviceId,
    getDeviceInfoForUsers,
    getDeviceIdsAndNotificationLevelsFromUserIds
};
