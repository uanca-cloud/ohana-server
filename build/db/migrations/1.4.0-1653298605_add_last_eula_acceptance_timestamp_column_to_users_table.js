module.exports = {
    up: () => {
        return `
            ALTER TABLE users ADD COLUMN last_eula_acceptance_timestamp timestamp DEFAULT null;
            UPDATE updates SET read = true;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS last_eula_acceptance_timestamp;
        `;
    }
};
