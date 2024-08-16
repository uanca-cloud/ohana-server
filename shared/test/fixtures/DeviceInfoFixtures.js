/**
 *
 * @type {Object.<string, DeviceInfo>}
 */
const fixtureData = {
    deviceInfo1: {
        userId: 123,
        deviceId: '64ba4e28-54ad-457a-be5f-d6e227679090',
        deviceName: 'GW-8910',
        deviceModel: 'Iphone 12',
        osVersion: 'Ios-14.5',
        deviceToken: 'sdasdasd23232-APA91bEGF17ok1yJ1FTChTZAbqRbHTfhm-222222',
        iv: '5otwihfW7IbyQZhHEhdT5w==',
        partialKey: 'kgERi7EOasdsdsdsyN3J9F6A==',
        notificationPlatform: 'gcm',
        appVersion: '1.0.0'
    },
    deviceInfo2: {
        userId: 321,
        deviceId: 'c6272117-c3ae-417c-9a35-aa1d5b13efae',
        deviceModel: 'Iphone 12',
        deviceName: 'GW-8912',
        osVersion: 'Ios-14.5',
        deviceToken: 'APA91bEGF17ok1yJ1FTChTZAbqRbHTfhm-dsdsdsds-222222',
        iv: 'YWFhYWFhYWFhYWFhYWFhYQ==',
        partialKey: 'kgERi7EOZOuvqSyN3J9F6A==',
        notificationPlatform: 'apns',
        appVersion: '1.0.0'
    },
    deviceInfo3: {
        userId: 112,
        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
        deviceModel: 'Iphone 11',
        deviceName: null,
        osVersion: 'Ios-13',
        deviceToken: 'sdsdddddddddddJ1FTChTZAbqRbHTfhm-dsdsdsds-222222',
        iv: 'EASDSSAWFhYWFhYWFhYQ==',
        partialKey: 'khYABdvqSyN3J9F6A==',
        notificationPlatform: 'gcm',
        appVersion: '1.0.0'
    },
    deviceInfo4: {
        userId: 5555,
        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a0',
        deviceModel: 'Iphone 11',
        deviceName: null,
        osVersion: 'Ios-13',
        deviceToken: 'sdsdddddddddddJ1FTChTZAbqRbHTfhm-dsdsdsds-222222',
        iv: 'EASDSSAWFhYWFhYWFhYQ==',
        partialKey: 'khYABdvqSyN3J9F6A==',
        notificationPlatform: 'gcm',
        appVersion: '2.0.0'
    },
    deviceInfo5: {
        userId: 112,
        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602u0',
        deviceModel: 'Iphone 12',
        deviceName: null,
        osVersion: 'Ios-14',
        deviceToken: 'sdsdddddddddddJ1FTChTZAbqRbHTfhm-dsdsdsds-11111',
        iv: 'EASDSSAWFhYWFhYWFhYQ==',
        partialKey: 'khYABdvqSyN3J9F6A==',
        notificationPlatform: 'apns',
        appVersion: '2.0.0'
    }
};

/**
 *
 * @type {Object.<string, DeviceInfo>}
 */
const fixtureResults = {
    deviceInfo1: {
        userId: '112',
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        roles: ['FamilyMember'],
        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
        notificationPlatform: 'gcm',
        appVersion: '1.0.0'
    }
};

/**
 * Inserts a device into the database
 * @param database - A database client instance
 * @param {DeviceInfo} deviceInfo
 * @returns Promise<{*}>
 */
function insertTestDeviceInfo(database, deviceInfo) {
    const parameters = [
        deviceInfo.userId,
        deviceInfo.deviceToken,
        deviceInfo.iv,
        deviceInfo.partialKey,
        deviceInfo.notificationPlatform,
        deviceInfo.deviceId,
        deviceInfo.osVersion,
        deviceInfo.deviceModel,
        deviceInfo.appVersion,
        deviceInfo.deviceName
    ];

    return database.query(
        `INSERT INTO device_info (
            user_id,
            device_token,
            iv,
            partial_key,
            notification_platform,
            device_id,
            os_version,
           device_model,
           app_version,
           device_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
            `,
        parameters
    );
}

async function findTestDeviceByUserId(database, userId) {
    return database.query(
        `
        SELECT 
           device_id,
           device_name,
           os_version,
           app_version,
           device_model,
           device_token,
           iv,
           partial_key,
           notification_platform
        FROM device_info 
        WHERE user_id = $1 LIMIT 1;
    `,
        [userId]
    );
}

module.exports = {
    fixtureData,
    fixtureResults,
    insertTestDeviceInfo,
    findTestDeviceByUserId
};
