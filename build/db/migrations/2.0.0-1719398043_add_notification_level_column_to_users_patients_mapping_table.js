module.exports = {
    up: () => {
        return `
        ALTER TABLE users_patients_mapping ADD notification_level text DEFAULT 'mute';
        `;
    },
    down: () => {
        return `
        ALTER TABLE IF EXISTS users_patients_mapping DROP COLUMN IF EXISTS notification_level;
        `;
    }
};
