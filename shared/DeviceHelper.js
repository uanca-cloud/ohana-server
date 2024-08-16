function formatDeviceId(deviceName, deviceId) {
    return deviceName ? `${deviceName}_${deviceId}` : `${deviceId}`;
}

module.exports = {formatDeviceId};
