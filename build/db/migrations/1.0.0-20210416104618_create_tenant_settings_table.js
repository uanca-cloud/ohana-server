const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        -- TENANT_SETTINGS --
        CREATE TABLE tenant_settings
        (
            tenant_id text NOT NULL,
            key text NOT NULL,
            value text,
            CONSTRAINT tenant_settings_pkey PRIMARY KEY (tenant_id, key)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_settings TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON tenant_settings TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        -- INSERT SQL IN REVERSE ORDER HERE
         DROP TABLE IF EXISTS tenant_settings;
        `;
    }
};
