module.exports = {
    up: () => {
        return `
            ALTER TABLE audit_events ADD COLUMN location_id integer;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS location_id;
        `;
    }
};
