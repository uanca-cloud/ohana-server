module.exports = {
    up: () => {
        return `
            ALTER TABLE IF EXISTS encounters ADD COLUMN external_id text;

            DO $$                  
                BEGIN 
                    IF EXISTS
                        ( SELECT 1
                          FROM   information_schema.tables 
                          WHERE  table_schema = 'public'
                          AND    table_name = 'temp_encounters_external'
                        )
                    THEN
                        UPDATE encounters e
                        SET external_id = temp.external_id
                        FROM temp_encounters_external temp
                        WHERE temp.id = e.id;
                        
                        DROP TABLE IF EXISTS temp_encounters_external;
                    END IF ;
                END
               $$;    
        `;
    },
    down: () => {
        return `
            CREATE TABLE temp_encounters_external AS TABLE encounters;
            ALTER TABLE IF EXISTS encounters DROP COLUMN IF EXISTS external_id;
        `;
    }
};
