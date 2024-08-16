module.exports = {
    up: () => {
        return `
        ALTER TABLE updates ADD COLUMN read_receipts jsonb DEFAULT '{}';
        `;
    },
    down: () => {
        return `
        ALTER TABLE updates DROP COLUMN IF EXISTS read_receipts;
        `;
    }
};
