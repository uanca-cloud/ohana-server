module.exports = {
    up: () => {
        return `
            CREATE TABLE temp_users AS TABLE users;
            
            ALTER TABLE users ADD COLUMN assigned_roles text[];
            
            UPDATE users SET
                assigned_roles = array[role]
                WHERE role IS NOT NULL;
                
            ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS role;
        `;
    },
    down: () => {
        return `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
            
            DO $$                  
            BEGIN
                IF EXISTS
                    ( SELECT 1
                        FROM information_schema.columns
                        WHERE  table_name = 'users'
                        AND column_name = 'assigned_roles'
                    )
                THEN
                    UPDATE users
                    SET role = assigned_roles[1]
                    WHERE assigned_roles IS NOT NULL
                    AND role IS NULL
                    AND array_length(assigned_roles, 1) > 0;
                END IF ;
            END
            $$;
            
            ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS assigned_roles;
            DROP TABLE IF EXISTS temp_users;
        `;
    }
};
