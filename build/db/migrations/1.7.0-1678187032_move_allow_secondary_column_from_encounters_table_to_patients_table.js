module.exports = {
    up: () => {
        return `
            CREATE TABLE temp_encounters_secondary AS TABLE users_patients_mapping;
            ALTER TABLE patients ADD COLUMN allow_secondary BOOLEAN;
                
            UPDATE patients AS p
            SET allow_secondary = e.allow_secondary
            FROM encounters AS e
            WHERE e.patient_id = p.id;
                
            ALTER TABLE IF EXISTS encounters DROP COLUMN IF EXISTS allow_secondary;
        `;
    },
    down: () => {
        return `
            ALTER TABLE encounters ADD COLUMN IF NOT EXISTS allow_secondary BOOLEAN;
            
            UPDATE encounters AS e
            SET allow_secondary = p.allow_secondary
            FROM patients AS p
            WHERE e.patient_id = p.id;

            UPDATE encounters AS e
            SET allow_secondary = false
            WHERE e.allow_secondary = null;
                
            ALTER TABLE IF EXISTS patients DROP COLUMN IF EXISTS allow_secondary;
            DROP TABLE IF EXISTS temp_encounters_secondary;
        `;
    }
};
