module.exports = {
    up: () => {
        return `
            ALTER TABLE audit_events ADD COLUMN family_member_type text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS family_member_type;
        `;
    }
};
