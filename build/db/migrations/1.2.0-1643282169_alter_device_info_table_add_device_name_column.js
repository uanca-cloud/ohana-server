module.exports = {
    up: () => {
        return `
            ALTER TABLE device_info ADD COLUMN device_name text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS device_info DROP COLUMN IF EXISTS device_name;
        `;
    }
};
