module.exports = {
    up: () => {
        return `
            ALTER TABLE patients ADD cc_creator_user_id text;
            ALTER TABLE patients ADD CONSTRAINT patients_cc_creator_user_id_fkey FOREIGN KEY (cc_creator_user_id) REFERENCES users (user_id);
        `;
    },
    down: () => {
        return `
            ALTER TABLE IF EXISTS patients DROP COLUMN IF EXISTS cc_creator_user_id;
            ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_cc_creator_user_id_fkey;
        `;
    }
};
