const json = require('../../../azure-functions/local.settings.json');
const {PG_REPORTING_USERNAME} = json.Values;

module.exports = {
    up: () => {
        return `
        GRANT SELECT ON _migrations TO ${PG_REPORTING_USERNAME};
        `;
    },
    down: () => {
        return `
        REVOKE SELECT ON _migrations FROM ${PG_REPORTING_USERNAME};
        `;
    }
};
