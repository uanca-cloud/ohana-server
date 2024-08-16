module.exports = {
    up: () => {
        return `
            ALTER TABLE family_identities ADD COLUMN is_primary boolean NOT NULL DEFAULT FALSE;
            UPDATE family_identities SET is_primary = true ;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS family_identities DROP COLUMN IF EXISTS is_primary;
        `;
    }
};
