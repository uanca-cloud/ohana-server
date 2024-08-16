module.exports = {
    up: () => {
        return `
        ALTER TABLE users ADD COLUMN deleted BOOLEAN DEFAULT false;
        ALTER TABLE users_patients_mapping ADD COLUMN deleted BOOLEAN DEFAULT false;
        `;
    },
    down: () => {
        return `
        ALTER TABLE users DROP COLUMN IF EXISTS deleted;
        ALTER TABLE users_patients_mapping DROP COLUMN IF EXISTS deleted;
        `;
    }
};
