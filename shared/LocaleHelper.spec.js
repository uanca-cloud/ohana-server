const mockOhanaShared = (mockLocales) => {
    jest.mock('./constants', () => ({
        LOCALES: mockLocales,
        DEFAULT_LOCALE: 'en_US'
    }));
};

describe('Given we want to get the preferred language by locale', () => {
    describe('when the locale exists in the list of locales', () => {
        test('then it should return the correct language', () => {
            mockOhanaShared([
                {id: 'en_US', language: 'English', country: 'US', azureLanguageCode: 'en_US'},
                {id: 'es_ES', language: 'Spanish', country: 'Spain', azureLanguageCode: 'es_ES'}
            ]);
            const {getPreferredLanguage} = require('./LocaleHelper');
            expect(getPreferredLanguage('es_ES')).toStrictEqual('Spanish');
        });
    });

    describe('when the locale does not exist in the list of locales', () => {
        test('then it should return the default language', () => {
            mockOhanaShared([
                {id: 'en_US', language: 'English', country: 'US', azureLanguageCode: 'en_US'}
            ]);
            const {getPreferredLanguage} = require('./LocaleHelper');
            expect(getPreferredLanguage('es_ES')).toStrictEqual('English');
        });
    });
});
