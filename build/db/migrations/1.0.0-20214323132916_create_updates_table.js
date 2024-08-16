const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
         ----UPDATES----
        CREATE TABLE updates
        (
            id text NOT NULL,
            user_id text NOT NULL,
            encounter_id integer NOT NULL,
            message text,
            created_at timestamp NOT NULL,
            CONSTRAINT updates_pkey PRIMARY KEY (id),
            CONSTRAINT updates_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(user_id),
            CONSTRAINT updates_encounter_id_fkey FOREIGN KEY(encounter_id) REFERENCES encounters(id)
        );
        GRANT SELECT, INSERT, UPDATE, DELETE ON updates TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON updates TO ${PG_REPORTING_USERNAME};
        
        ----CAREGIVER_QUICK_MESSAGES----
        CREATE TABLE caregiver_quick_messages
        (
            user_id text NOT NULL,
            quick_messages text [] NOT NULL,
            CONSTRAINT caregiver_quick_messages_pkey PRIMARY KEY (user_id),
            CONSTRAINT caregiver_quick_messages_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(user_id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON caregiver_quick_messages TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON caregiver_quick_messages TO ${PG_REPORTING_USERNAME};
        
        ----LOCATION_QUICK_MESSAGES----
        CREATE TABLE location_quick_messages
        (
            id SERIAL,
            quick_messages jsonb NOT NULL,
            message_order integer CHECK (message_order > 0) NOT NULL,
            location_id integer NOT NULL,
            tenant_id text NOT NULL,
            CONSTRAINT location_quick_messages_pkey PRIMARY KEY (id),
            CONSTRAINT location_quick_messages_location_id_fkey FOREIGN KEY(location_id) REFERENCES locations(id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON location_quick_messages TO ${PG_BASIC_USERNAME};
        GRANT SELECT, USAGE ON location_quick_messages_id_seq TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON location_quick_messages TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON location_quick_messages_id_seq TO ${PG_REPORTING_USERNAME};
        
        -- ATTACHMENTS --
        CREATE TABLE attachments
        (
            id text NOT NULL,
            update_id text NOT NULL,
            encounter_id integer NOT NULL,
            metadata jsonb NOT NULL,
            type text NOT NULL,
            CONSTRAINT attachments_unique_idx UNIQUE (id, update_id)
        );

        GRANT SELECT, INSERT, UPDATE, DELETE ON attachments TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON attachments TO ${PG_REPORTING_USERNAME};
        CREATE INDEX IF NOT EXISTS filename_idx ON attachments USING GIN ((metadata -> 'filename'));
        CREATE INDEX IF NOT EXISTS type_idx ON attachments(type);
        `;
    },
    down: () => {
        return `
        -- INSERT SQL IN REVERSE ORDER HERE
        DROP INDEX IF EXISTS type_idx;
        DROP INDEX IF EXISTS filename_idx;
        DROP TABLE IF EXISTS attachments;
        DROP TABLE IF EXISTS location_quick_messages;
        DROP TABLE IF EXISTS caregiver_quick_messages;
        DROP TABLE IF EXISTS updates;
        `;
    }
};
