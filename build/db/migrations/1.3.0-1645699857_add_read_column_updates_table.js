module.exports = {
    up: () => {
        return `
            ALTER TABLE updates ADD COLUMN read boolean NOT NULL DEFAULT FALSE;
            UPDATE updates SET read = true;
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS updates DROP COLUMN IF EXISTS read;
        `;
    }
};
