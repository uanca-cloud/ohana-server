const json = require('../../../azure-functions/local.settings.json');
const {PG_BASIC_USERNAME, PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        CREATE TABLE audit_events_reports
        (
            id text NOT NULL,
            user_id text NOT NULL,
            tenant_id text NOT NULL,
            start_date timestamp NOT NULL,
            end_date timestamp NOT NULL,
            status text NOT NULL,
            status_date timestamp NOT NULL,
            name text NOT NULL,
            metadata jsonb[],
            CONSTRAINT audit_events_reports_pkey PRIMARY KEY (id),
            CONSTRAINT audit_events_reports_fkey FOREIGN KEY(user_id) REFERENCES users(user_id)
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON audit_events_reports TO ${PG_BASIC_USERNAME};
        GRANT SELECT ON audit_events_reports TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        DROP TABLE IF EXISTS audit_events_reports;
        `;
    }
};
