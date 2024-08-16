module.exports = {
    up: () => {
        return `
            ALTER TABLE device_info ADD COLUMN registration_id text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS device_info DROP COLUMN IF EXISTS registration_id;
        `;
    }
};
