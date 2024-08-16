module.exports = {
    up: () => {
        return `
        ALTER TABLE family_identities ADD invited_by text, ADD created_at timestamp;
        `;
    },
    down: () => {
        return `
        ALTER TABLE IF EXISTS family_identities DROP COLUMN IF EXISTS invited_by, DROP COLUMN IF EXISTS created_at;
        `;
    }
};
