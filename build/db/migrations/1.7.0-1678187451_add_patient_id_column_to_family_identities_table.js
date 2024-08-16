module.exports = {
    up: () => {
        return `
            CREATE TABLE temp_family_identities AS TABLE family_identities;
            ALTER TABLE family_identities ADD COLUMN patient_id integer;
            ALTER TABLE family_identities ADD CONSTRAINT family_identities_patients_fkey FOREIGN KEY(patient_id) REFERENCES patients(id);
                
            UPDATE family_identities AS fi
            SET patient_id = e.patient_id
            FROM encounters AS e
            WHERE e.id = fi.encounter_id;
    
            ALTER TABLE family_identities DROP COLUMN IF EXISTS encounter_id;
        `;
    },
    down: () => {
        return `
            ALTER TABLE family_identities ADD COLUMN IF NOT EXISTS encounter_id integer;
            
            DO $$                  
            BEGIN
            IF EXISTS
                    ( SELECT 1
                      FROM   information_schema.columns 
                      WHERE  table_schema = 'public'
                      AND    table_name = 'family_identities' AND column_name = 'patient_id'
                    )
                THEN
                    UPDATE family_identities fi
                    SET encounter_id = subquery.id
                    FROM (
                        SELECT DISTINCT ON (patient_id) * 
                        FROM encounters
                        ORDER BY patient_id, updated_at DESC
                        ) AS subquery
                    WHERE fi.patient_id=subquery.patient_id;
                END IF ;
            END
           $$ ;  

            ALTER TABLE family_identities DROP COLUMN IF EXISTS patient_id;
            DROP TABLE IF EXISTS temp_family_identities;
        `;
    }
};
