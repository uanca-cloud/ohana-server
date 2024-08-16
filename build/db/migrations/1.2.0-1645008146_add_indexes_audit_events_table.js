module.exports = {
    up: () => {
        return `
            CREATE INDEX IF NOT EXISTS audit_events_location_idx ON audit_events(location_id);
            CREATE INDEX IF NOT EXISTS audit_events_tenant_idx ON audit_events(tenant_id);
            CREATE INDEX IF NOT EXISTS attachments_update_idx ON attachments(update_id);
        `;
    },
    down: () => {
        return `
            DROP INDEX IF EXISTS audit_events_location_idx;
            DROP INDEX IF EXISTS audit_events_tenant_idx;
            DROP INDEX IF EXISTS attachments_update_idx;
        `;
    }
};
