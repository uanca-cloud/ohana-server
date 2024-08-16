const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = process.env;

module.exports = {
    up: () => {
        return `
         ----USERS----
        CREATE TABLE users
        (
            user_id text NOT NULL,
            tenant_id text NOT NULL,
            role text NOT NULL,
            first_name text,
            last_name text,
            title text,
            email text,
            CONSTRAINT users_pkey PRIMARY KEY (user_id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON users TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON users TO ${PG_REPORTING_USERNAME};
        
        ----DEVICE INFO----
        CREATE TABLE device_info
        (
            device_id text NOT NULL,
            device_model text NOT NULL,
            os_version text NOT NULL,
            app_version text NOT NULL,
            user_id text NOT NULL,
            device_token text ,
            iv text ,
            partial_key text ,
            notification_platform text ,
            CONSTRAINT device_info_pkey PRIMARY KEY (device_id),
            CONSTRAINT device_info_fkey FOREIGN KEY(user_id) REFERENCES users(user_id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON device_info TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON device_info TO ${PG_REPORTING_USERNAME};
        
         ----USER_PATIENTS----
        CREATE TABLE users_patients_mapping
        (
            id SERIAL,
            patient_id integer NOT NULL,
            user_id text NOT NULL,
            encounter_id integer NOT NULL,
            CONSTRAINT users_patients_mapping_pkey PRIMARY KEY (id),
            CONSTRAINT users_patients_mapping_patient_id_fkey FOREIGN KEY(patient_id) REFERENCES patients(id),
            CONSTRAINT users_patients_mapping_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(user_id),
            CONSTRAINT users_patients_mapping_encounter_id_fkey FOREIGN KEY(encounter_id) REFERENCES encounters(id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON users_patients_mapping TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON users_patients_mapping_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON users_patients_mapping TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON users_patients_mapping_id_seq TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS users_patients_mapping;
        DROP TABLE IF EXISTS device_info;
        DROP TABLE IF EXISTS users;
        `;
    }
};
