const Joi = require('joi'),
    {
        CONSTANTS: {MAX_LOCALIZED_QUICK_MESSAGES, LOCALES, DEFAULT_LOCALE}
    } = require('ohana-shared');
let localeIds = [DEFAULT_LOCALE];
if (LOCALES.length) {
    localeIds = LOCALES.map((locale) => locale.id);
}

const quickMessagesValidation = Joi.object().keys({
    text: Joi.string(),
    locale: Joi.string().valid(...localeIds)
});

const createLocationQuickMessage = Joi.object()
    .keys({
        locationId: Joi.number(),
        quickMessages: Joi.array()
            .items(quickMessagesValidation)
            .has(
                Joi.object().keys({
                    text: Joi.string(),
                    locale: Joi.string().valid(DEFAULT_LOCALE).required()
                })
            )
            .max(parseInt(MAX_LOCALIZED_QUICK_MESSAGES))
            .required()
    })
    .required();

module.exports = createLocationQuickMessage;
