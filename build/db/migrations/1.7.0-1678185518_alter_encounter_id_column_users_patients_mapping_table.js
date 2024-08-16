module.exports = {
    up: () => {
        return `
            CREATE TABLE temp_users_patients_mapping AS TABLE users_patients_mapping;
            ALTER TABLE IF EXISTS users_patients_mapping ALTER COLUMN encounter_id DROP NOT NULL;
        `;
    },
    down: () => {
        return `
            UPDATE users_patients_mapping upm
            SET encounter_id = subquery.id
            FROM (
                SELECT DISTINCT ON (patient_id) * 
                FROM encounters
                ORDER BY patient_id, updated_at DESC
                ) AS subquery
            WHERE upm.patient_id=subquery.patient_id;
            
            ALTER TABLE IF EXISTS users_patients_mapping ALTER COLUMN encounter_id SET NOT NULL;
            DROP TABLE IF EXISTS temp_users_patients_mapping;
        `;
    }
};
