let resolver = null;

function mockOhanaShared(mockLocales) {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            LOCALES: mockLocales,
            MAX_LOCALIZED_QUICK_MESSAGES: 2,
            DEFAULT_LOCALE: 'pt_PT'
        }
    }));
}

beforeEach(() => {
    mockOhanaShared([{id: 'en_US'}, {id: 'en_GB'}, {id: 'es_ES'}]);
    resolver = require('./UpdateLocationQuickMessageSchemaValidation');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to validate the Graphql schema for updating a location quick messages mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await resolver.validateAsync({
                messageId: 1,
                quickMessages: [{text: 'location message', locale: 'en_US'}]
            });
            expect(result).toEqual(
                expect.objectContaining({
                    messageId: 1,
                    quickMessages: [{text: 'location message', locale: 'en_US'}]
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await resolver.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(2);
                    expect(err.details[0].message).toBe('"messageId" is required');
                    expect(err.details[1].message).toBe('"quickMessages" is required');
                });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync({
                        messageId: '1',
                        quickMessages: [{text: 'location message', locale: 'en_US'}]
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"messageId" must be a number')
                    );
            });
        });

        describe('and max number of messages is exceeded', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync({
                        messageId: 1,
                        quickMessages: [
                            {text: 'Smth 21', locale: 'en_US'},
                            {text: 'Smth 25', locale: 'en_GB'},
                            {text: 'Smth 26', locale: 'es_ES'}
                        ]
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"quickMessages" must contain less than or equal to 2 items'
                        )
                    );
            });
        });

        describe('and an invalid locale is provided', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync(
                        {
                            messageId: 1,
                            quickMessages: [
                                {text: 'Smth 21', locale: 'fr_FR'},
                                {text: 'Smth 25', locale: 'it_IT'}
                            ]
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details[0].message).toBe(
                            '"quickMessages[0].locale" must be one of [en_US, en_GB, es_ES]'
                        );
                        expect(err.details[1].message).toBe(
                            '"quickMessages[1].locale" must be one of [en_US, en_GB, es_ES]'
                        );
                    });
            });
        });
    });
});
