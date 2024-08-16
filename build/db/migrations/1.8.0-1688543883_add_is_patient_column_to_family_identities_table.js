module.exports = {
    up: () => {
        return `
        ALTER TABLE family_identities ADD COLUMN is_patient boolean NOT NULL DEFAULT false;
        
        BEGIN;
        UPDATE family_identities
        SET is_patient = true
        WHERE patient_relationship = 'Self/Patient';
        COMMIT;
        `;
    },
    down: () => {
        return `
        ALTER TABLE IF EXISTS family_identities DROP COLUMN IF EXISTS is_patient;
        `;
    }
};
