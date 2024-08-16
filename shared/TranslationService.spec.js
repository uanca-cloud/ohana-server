let translateText = null;

const mockFetch = (mockData, mockOk, mockStatus) => {
    jest.mock('node-fetch', () =>
        jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockData),
                ok: mockOk,
                status: mockStatus
            })
        )
    );
};

afterEach(() => {
    jest.unmock('node-fetch');
});

describe('Given we want to use the translation service to translate text', () => {
    describe('when there is a list of preferred locales', () => {
        describe('when the translation request fails', () => {
            test('then it should return an empty array', async () => {
                mockFetch([], false, 400);
                translateText = require('./TranslationService');

                const result = await translateText('test', 'en', [
                    {id: 'es_ES', azureLanguageCode: 'es'}
                ]);

                expect(result).toStrictEqual([]);
            });
        });

        describe('when the translation request is successful', () => {
            test('then the text should be translated', async () => {
                mockFetch(
                    [
                        {
                            translations: [
                                {
                                    text: 'translated text',
                                    to: 'es'
                                }
                            ]
                        }
                    ],
                    true,
                    200
                );

                translateText = require('./TranslationService');

                const result = await translateText('test', 'en', [
                    {id: 'es_ES', azureLanguageCode: 'es'}
                ]);

                expect(result).toStrictEqual([{text: 'translated text', locale: 'es_ES'}]);
            });
        });

        describe('when a preferred locale is set for multiple family members', () => {
            test('then the translate should be called with the language only once', async () => {
                mockFetch(
                    [
                        {
                            translations: [
                                {
                                    text: 'translated text es',
                                    to: 'es'
                                },
                                {
                                    text: 'translated text fr',
                                    to: 'fr'
                                }
                            ]
                        }
                    ],
                    true,
                    200
                );
                translateText = require('./TranslationService');

                const result = await translateText('test', 'en', [
                    {id: 'es_ES', azureLanguageCode: 'es'},
                    {id: 'fr_FR', azureLanguageCode: 'fr'},
                    {id: 'es_ES', azureLanguageCode: 'es'}
                ]);

                expect(result).toStrictEqual([
                    {text: 'translated text es', locale: 'es_ES'},
                    {text: 'translated text fr', locale: 'fr_FR'}
                ]);
            });
        });

        describe('when preferred locale is set to english', () => {
            test('then the text should be not translated to english but should return any translated text and the default english text', async () => {
                mockFetch(
                    [
                        {
                            translations: [
                                {
                                    text: 'translated text',
                                    to: 'es'
                                }
                            ]
                        }
                    ],
                    true,
                    200
                );
                translateText = require('./TranslationService');

                const result = await translateText('default text', 'en', [
                    {id: 'es_ES', azureLanguageCode: 'es'},
                    {id: 'en_US', azureLanguageCode: 'en'}
                ]);

                expect(result).toStrictEqual([
                    {text: 'default text', locale: 'en_US'},
                    {text: 'translated text', locale: 'es_ES'}
                ]);
            });
        });
    });

    describe('when the list of preferred locales is empty', () => {
        test('then it should return an empty array', async () => {
            mockFetch([], false, 400);
            translateText = require('./TranslationService');

            const result = await translateText('test', 'en', []);

            expect(result).toStrictEqual([]);
        });
    });
});
