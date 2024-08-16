module.exports = {
    up: () => {
        return `
            ALTER TABLE audit_events_reports ADD COLUMN generated_at timestamp;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events_reports DROP COLUMN IF EXISTS generated_at;
        `;
    }
};
