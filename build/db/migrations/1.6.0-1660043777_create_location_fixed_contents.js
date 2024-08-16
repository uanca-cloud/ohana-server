const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        -- FIXED_CONTENTS --
        CREATE TABLE location_fixed_contents
        (
            id SERIAL,
            location_id integer,
            title text NOT NULL,
            url text NOT NULL,
            color text NOT NULL,
            tenant_id text NOT NULL,
            content_order integer CHECK (content_order > 0) NOT NULL,
            CONSTRAINT location_fixed_contents_pkey PRIMARY KEY (id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON location_fixed_contents TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON location_fixed_contents TO ${PG_REPORTING_USERNAME};
        
        GRANT SELECT, USAGE ON location_fixed_contents_id_seq TO ${PG_REPORTING_USERNAME};
        GRANT SELECT, USAGE ON location_fixed_contents_id_seq TO ${PG_BASIC_USERNAME};
        `;
    },
    down: () => {
        return `
        -- INSERT SQL IN REVERSE ORDER HERE
         DROP TABLE IF EXISTS location_fixed_contents;
        `;
    }
};
