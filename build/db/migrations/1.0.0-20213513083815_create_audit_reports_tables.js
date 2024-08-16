const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        CREATE TABLE audit_events
        (
            id SERIAL,
            event_id text NOT NULL,
            tenant_id text NOT NULL,
            created_at timestamp NOT NULL,
            patient_id integer NOT NULL,
            performing_user_id text NOT NULL,
            performing_user_type text NOT NULL,
            performing_user_display_name text NOT NULL,
            device_id text,
            device_model text NOT NULL,
            os_version text NOT NULL,
            app_version text ,
            scan_status text ,
            update_content text ,
            update_id text ,
            invitation_type text ,
            family_display_name text ,
            family_relation text ,
            family_language text ,
            family_contact_number text ,
            CONSTRAINT audit_events_pkey PRIMARY KEY (id),
            CONSTRAINT audit_events_patients_fkey FOREIGN KEY(patient_id) REFERENCES patients(id)
        );
        CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON audit_events TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON audit_events_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON audit_events TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON audit_events_id_seq TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS audit_events;
        `;
    }
};
