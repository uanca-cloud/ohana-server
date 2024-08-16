module.exports = {
    up: () => {
        return `
        ALTER TABLE audit_events ALTER COLUMN performing_user_display_name DROP NOT NULL;
        ALTER TABLE audit_events ALTER COLUMN device_model DROP NOT NULL;
        ALTER TABLE audit_events ALTER COLUMN os_version DROP NOT NULL;
        ALTER TABLE audit_events_reports ADD CONSTRAINT audit_events_reports_unique_idx UNIQUE (user_id, tenant_id, name);
        `;
    },
    down: () => {
        return `
        UPDATE audit_events SET performing_user_display_name = '' WHERE performing_user_display_name IS NULL;
        UPDATE audit_events SET device_model = '' WHERE device_model IS NULL;
        UPDATE audit_events SET os_version = '' WHERE os_version IS NULL;
        ALTER TABLE IF EXISTS audit_events ALTER COLUMN performing_user_display_name SET NOT NULL;
        ALTER TABLE IF EXISTS audit_events ALTER COLUMN device_model SET NOT NULL;
        ALTER TABLE IF EXISTS audit_events ALTER COLUMN os_version SET NOT NULL;
        ALTER TABLE IF EXISTS audit_events_reports DROP CONSTRAINT IF EXISTS audit_events_reports_unique_idx;
        `;
    }
};
