const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = process.env;

module.exports = {
    up: () => {
        return `
        ----ENCOUNTERS----
        CREATE TABLE encounters
        (
            id SERIAL,
            patient_id integer NOT NULL,
            tenant_id text NOT NULL,
            created_at timestamp NOT NULL,
            ended_at timestamp,
            updated_at timestamp NOT NULL,
            CONSTRAINT encounters_pkey PRIMARY KEY (id),
            CONSTRAINT encounters_fkey FOREIGN KEY(patient_id) REFERENCES patients(id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON encounters TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON encounters_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON encounters TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON encounters_id_seq TO ${PG_REPORTING_USERNAME};
        
        ----LOCATIONS----
        CREATE TABLE locations
        (
            id SERIAL,
            label text NOT NULL,
            tenant_id text NOT NULL,
            CONSTRAINT locations_pkey PRIMARY KEY (id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON locations TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON locations_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON locations TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON locations_id_seq TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS locations;
        DROP TABLE IF EXISTS encounters;
        `;
    }
};
