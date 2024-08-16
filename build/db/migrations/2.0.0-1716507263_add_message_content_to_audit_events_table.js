module.exports = {
    up: () => {
        return `
            ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS message_content text;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS audit_events DROP COLUMN IF EXISTS message_content;
        `;
    }
};
