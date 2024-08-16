module.exports = {
    up: () => {
        return `
            ALTER TABLE patients ADD COLUMN patient_ulid text;
            
             DO $$                  
                BEGIN 
                    IF EXISTS
                        ( SELECT 1
                          FROM   information_schema.tables 
                          WHERE  table_schema = 'public'
                          AND    table_name = 'temp_patient_ulids'
                        )
                    THEN
                        UPDATE patients AS p
                        SET patient_ulid = tp.patient_ulid
                        FROM temp_patient_ulids AS tp
                        WHERE tp.id = p.id;
                        
                        DROP TABLE IF EXISTS temp_patient_ulids;
                    END IF ;
                END
               $$;    
        `;
    },
    down: () => {
        return `
            DO $$                  
                BEGIN
                    IF EXISTS
                        ( SELECT 1
                            FROM information_schema.columns
                            WHERE  table_name = 'patients'
                            AND column_name = 'patient_ulid'
                        )
                    THEN
                       CREATE TABLE temp_patient_ulids AS TABLE patients;
                    END IF ;
                END
                $$;

            ALTER TABLE IF EXISTS patients DROP COLUMN IF EXISTS patient_ulid;
        `;
    }
};
