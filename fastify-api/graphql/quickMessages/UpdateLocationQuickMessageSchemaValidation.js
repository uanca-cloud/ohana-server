const Joi = require('joi'),
    {
        CONSTANTS: {MAX_LOCALIZED_QUICK_MESSAGES, LOCALES, DEFAULT_LOCALE}
    } = require('ohana-shared');
let localeIds = [DEFAULT_LOCALE];
if (LOCALES.length) {
    localeIds = LOCALES.map((locale) => locale.id);
}

const updateLocationQuickMessage = Joi.object()
    .keys({
        messageId: Joi.number().required(),
        quickMessages: Joi.array()
            .items(
                Joi.object({
                    text: Joi.string(),
                    locale: Joi.string().valid(...localeIds)
                })
            )
            .max(parseInt(MAX_LOCALIZED_QUICK_MESSAGES))
            .required()
    })
    .required();

module.exports = updateLocationQuickMessage;
