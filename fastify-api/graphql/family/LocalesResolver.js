const {
    CONSTANTS: {LOCALES},
    getLogger
} = require('ohana-shared');

const logger = getLogger('LocalesResolver');

async function LocalesResolver() {
    if (!LOCALES.length) {
        logger.warn('Locales list is empty');
    }

    return LOCALES;
}

module.exports = LocalesResolver;
