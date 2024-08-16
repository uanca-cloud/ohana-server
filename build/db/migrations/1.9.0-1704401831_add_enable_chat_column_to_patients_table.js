module.exports = {
    up: () => {
        return `
            ALTER TABLE patients ADD COLUMN enable_chat BOOLEAN DEFAULT true;
        `;
    },
    down: () => {
        return `
            ALTER TABLE patients DROP COLUMN IF EXISTS enable_chat;
        `;
    }
};
