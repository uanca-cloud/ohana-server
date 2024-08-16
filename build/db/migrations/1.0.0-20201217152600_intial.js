const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = process.env;

module.exports = {
    up: () => {
        return `
        ----PATIENTS----
        CREATE TABLE patients
        (
            id SERIAL,
            external_id text NOT NULL,
            external_id_type text,
            tenant_id text NOT NULL,
            first_name text NOT NULL,
            last_name text NOT NULL,
            date_of_birth date NOT NULL,
            location_id integer,
            CONSTRAINT patients_pkey PRIMARY KEY (id)
        );
        GRANT CONNECT ON DATABASE ohana TO ${PG_BASIC_USERNAME};
        GRANT CONNECT ON DATABASE ohana TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON patients_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON patients TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON patients_id_seq TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS patients;
        `;
    }
};
