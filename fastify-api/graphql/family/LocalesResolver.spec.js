const mockOhanaShared = (mockLocales) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            LOCALES: mockLocales
        }
    }));
};

describe('Given we want to resolve a GQL query to list the locales', () => {
    describe('When the locales list is empty', () => {
        test('then it should return an empty array', async () => {
            mockOhanaShared([]);
            const resolver = require('./LocalesResolver');
            const result = await resolver();

            expect(result).toStrictEqual([]);
        });
    });

    describe('When locales list is not empty', () => {
        test('then it should return the array', async () => {
            const locales = [
                {id: 'en_US', language: 'English', country: 'US', azureLanguageCode: 'en'},
                {id: 'es_ES', language: 'Spanish', country: 'Spain', azureLanguageCode: 'es'}
            ];
            mockOhanaShared(locales);
            const resolver = require('./LocalesResolver');
            const result = await resolver();

            expect(result).toStrictEqual(locales);
        });
    });
});
