module.exports = {
    up: () => {
        return `
            ALTER TABLE IF EXISTS patients ADD COLUMN cdr_id text;
            
            DO $$                  
                BEGIN 
                    IF EXISTS
                        ( SELECT 1
                          FROM   information_schema.tables 
                          WHERE  table_schema = 'public'
                          AND    table_name = 'temp_patients'
                        )
                    THEN
                        UPDATE patients p
                        SET cdr_id = temp.cdr_id
                        FROM temp_patients temp
                        WHERE temp.id = p.id;
                        
                        DROP TABLE IF EXISTS temp_patients;
                    END IF ;
                END
               $$;    
        `;
    },
    down: () => {
        return `
            CREATE TABLE temp_patients AS TABLE patients;
            ALTER TABLE IF EXISTS patients DROP COLUMN IF EXISTS cdr_id;
        `;
    }
};
