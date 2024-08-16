const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = process.env;

module.exports = {
    up: () => {
        return `
           -- READ_RECEIPTS --
            CREATE TABLE IF NOT EXISTS updates_read_receipts
            (
                id SERIAL,
                read_at timestamp NOT NULL,
                update_id text NOT NULL,
                user_id text NOT NULL,
                patient_id integer NOT NULL,
                CONSTRAINT updates_read_receipts_pkey PRIMARY KEY (id),
                CONSTRAINT updates_read_receipts_updates_fkey FOREIGN KEY(update_id) REFERENCES updates(id) ON DELETE CASCADE,
                CONSTRAINT updates_read_receipts_patients_fkey FOREIGN KEY(patient_id) REFERENCES patients(id),
                CONSTRAINT updates_read_receipts_unique_idx UNIQUE (update_id, patient_id, user_id)
            );
            
            GRANT SELECT, INSERT, UPDATE, DELETE ON updates_read_receipts TO ${PG_BASIC_USERNAME};
            GRANT SELECT ON updates_read_receipts TO ${PG_REPORTING_USERNAME};
            
            GRANT SELECT, USAGE ON updates_read_receipts_id_seq TO ${PG_REPORTING_USERNAME};
            GRANT SELECT, USAGE ON updates_read_receipts_id_seq TO ${PG_BASIC_USERNAME};

            INSERT INTO updates_read_receipts(update_id, user_id, patient_id, read_at)
            SELECT 
                id as update_id, 
                key as user_id,
                patient_id,
                value::text::timestamp as read_at
            FROM updates
            CROSS JOIN jsonb_each(read_receipts);
            
            ALTER TABLE updates DROP COLUMN IF EXISTS read_receipts;
        `;
    },
    down: () => {
        return `
            ALTER TABLE updates ADD COLUMN IF NOT EXISTS read_receipts jsonb DEFAULT '{}';

            DO $$                  
            BEGIN
            IF EXISTS
                    ( SELECT 1
                      FROM   information_schema.columns 
                      WHERE  table_schema = 'public'
                      AND    table_name = 'updates_read_receipts'
                    )
                THEN
                    UPDATE updates
                    SET read_receipts=sub.read_receipts
                    FROM (SELECT update_id, jsonb_object_agg(user_id, read_at) as read_receipts
                        FROM updates_read_receipts
                        GROUP BY update_id) AS sub
                    WHERE id=sub.update_id;
                END IF ;
            END
           $$ ;
            
            DROP TABLE IF EXISTS updates_read_receipts;
        `;
    }
};
