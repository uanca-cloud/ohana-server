const {v4: uuid} = require('uuid'),
    fetch = require('node-fetch'),
    {
        TRANSLATOR_SERVICE_LOCATION,
        TRANSLATOR_SERVICE_ENDPOINT,
        TRANSLATOR_SERVICE_KEY
    } = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('UpdatesService');

async function translateText(text, languageFrom, preferredLocales) {
    logger.debug('Translating text...');
    let languagesTo = '';
    const translatedTextAndLocals = [];
    const defaultLanguage = {};

    preferredLocales
        .filter((preferredLocale) => !!preferredLocale)
        .forEach(({id, azureLanguageCode}) => {
            if (azureLanguageCode === languageFrom) {
                defaultLanguage.text = text;
                defaultLanguage.locale = id;
            }

            if (!languagesTo.includes(azureLanguageCode) && azureLanguageCode !== languageFrom) {
                languagesTo += azureLanguageCode + ',';
            }
        });

    if (Object.keys(defaultLanguage).length !== 0) {
        translatedTextAndLocals.push(defaultLanguage);
    }

    if (!languagesTo) {
        logger.info('No language translation needed.');
        return translatedTextAndLocals;
    }

    languagesTo = languagesTo.substring(0, languagesTo.length - 1);

    const res = await fetch(
        `${TRANSLATOR_SERVICE_ENDPOINT}/translate?api-version=3.0&from=${languageFrom}&to=${languagesTo}`,
        {
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': TRANSLATOR_SERVICE_KEY,
                'Ocp-Apim-Subscription-Region': TRANSLATOR_SERVICE_LOCATION,
                'Content-type': 'application/json',
                'X-ClientTraceId': uuid().toString()
            },
            body: JSON.stringify([
                {
                    text: text
                }
            ]),
            responseType: 'json'
        }
    );

    if (res.ok) {
        const data = await res.json();

        return translatedTextAndLocals.concat(
            data[0]?.translations?.map((translation) => {
                const preferredLocale = preferredLocales.find(
                    (preferredLocale) =>
                        preferredLocale && preferredLocale.azureLanguageCode === translation.to
                );
                return {
                    text: translation?.text,
                    locale: preferredLocale?.id
                };
            })
        );
    } else {
        logger.error({error: res}, 'Azure language translation service failed!');
        return translatedTextAndLocals;
    }
}

module.exports = translateText;
