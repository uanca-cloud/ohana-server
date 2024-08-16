module.exports = {
    up: () => {
        return `        
            ALTER TABLE audit_events ADD COLUMN quick_message text;
            ALTER TABLE audit_events ADD COLUMN free_text_translation text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS quick_message;
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS free_text_translation;
        `;
    }
};
