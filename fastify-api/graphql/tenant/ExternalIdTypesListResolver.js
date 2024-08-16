const {
    CONSTANTS: {EXTERNAL_ID_TYPES},
    getLogger
} = require('ohana-shared');

const logger = getLogger('ExternalIdTypesListResolver');

async function ExternalIdTypesListResolver() {
    if (!EXTERNAL_ID_TYPES.length) {
        logger.warn('External id types list is empty');
    }

    return EXTERNAL_ID_TYPES;
}

module.exports = ExternalIdTypesListResolver;
