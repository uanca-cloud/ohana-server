const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = process.env;

module.exports = {
    up: () => {
        return `
        ----Identities----
        CREATE TABLE family_identities
        (
            user_id text NOT NULL,
            encounter_id integer NOT NULL,
            public_key text NOT NULL,
            phone_number text,
            patient_relationship text,
            preferred_locale text,
            CONSTRAINT family_identities_pkey PRIMARY KEY (user_id),
            CONSTRAINT family_identities_fkey FOREIGN KEY(encounter_id) REFERENCES encounters(id)
        );

        GRANT SELECT, INSERT, UPDATE, DELETE ON family_identities TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON family_identities TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS family_identities;
        `;
    }
};
