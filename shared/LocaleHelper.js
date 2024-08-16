const {LOCALES, DEFAULT_LOCALE} = require('./constants');

function getPreferredLanguage(preferredLocale) {
    const selectedLocale = LOCALES.find((locale) => locale.id === preferredLocale);
    const defaultLocale = LOCALES.find((locale) => locale.id === DEFAULT_LOCALE);
    return selectedLocale ? selectedLocale?.language : defaultLocale.language;
}

module.exports = {getPreferredLanguage};
