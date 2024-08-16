module.exports = {
    up: () => {
        return `
            ALTER TABLE IF EXISTS audit_events ADD COLUMN IF NOT EXISTS external_id text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS external_id;
        `;
    }
};
