const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        -- LOCATION_SETTINGS --
        CREATE TABLE location_settings
        (
            location_id integer NOT NULL,
            key text NOT NULL,
            value text,
            tenant_id text NOT NULL,
            CONSTRAINT location_settings_pkey PRIMARY KEY (location_id, key),
            CONSTRAINT location_settings_location_id_fkey FOREIGN KEY(location_id) REFERENCES locations(id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON location_settings TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON location_settings TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        -- INSERT SQL IN REVERSE ORDER HERE
         DROP TABLE IF EXISTS location_settings;
        `;
    }
};
