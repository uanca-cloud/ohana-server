module.exports = {
    up: () => {
        return `
            ALTER TABLE IF EXISTS audit_events ALTER COLUMN performing_user_id DROP NOT NULL;
            ALTER TABLE audit_events ADD COLUMN performing_user_title text;
        `;
    },
    down: () => {
        return `
            UPDATE audit_events SET performing_user_id = '' WHERE performing_user_id IS NULL;
            ALTER TABLE IF EXISTS audit_events ALTER COLUMN performing_user_id SET NOT NULL;
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS performing_user_title;
        `;
    }
};
