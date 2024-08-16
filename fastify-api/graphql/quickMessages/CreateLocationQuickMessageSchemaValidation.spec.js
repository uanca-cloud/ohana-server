let resolver = null;

function mockOhanaShared(mockLocales) {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            LOCALES: mockLocales,
            MAX_LOCALIZED_QUICK_MESSAGES: 2,
            DEFAULT_LOCALE: 'en_US'
        }
    }));
}

beforeEach(() => {
    mockOhanaShared([{id: 'en_US'}, {id: 'en_GB'}, {id: 'es_ES'}]);
    resolver = require('./CreateLocationQuickMessageSchemaValidation');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to validate the Graphql schema for creating a location quick message mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await resolver.validateAsync({
                locationId: 1,
                quickMessages: [{text: 'location message', locale: 'en_US'}]
            });
            expect(result).toEqual(
                expect.objectContaining({
                    locationId: 1,
                    quickMessages: [{text: 'location message', locale: 'en_US'}]
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('when no input is provided', () => {
            it('then it should throw', async () => {
                await resolver.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe('"quickMessages" is required');
                });
            });
        });

        describe('when a string is provided instead of a number for locationId', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync({
                        locationId: '1',
                        quickMessages: [{text: 'location message', locale: 'en_US'}]
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"locationId" must be a number')
                    );
            });
        });

        describe('when max number of messages is exceeded', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync({
                        locationId: 1,
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

        describe('when an invalid locale is provided', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync(
                        {
                            locationId: 1,
                            quickMessages: [
                                {text: 'Smth 25', locale: 'en_US'},
                                {text: 'Smth 23', locale: 'it_IT'}
                            ]
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details[0].message).toBe(
                            '"quickMessages[1].locale" must be one of [en_US, en_GB, es_ES]'
                        );
                    });
            });
        });

        describe('when the default locale is not provided', () => {
            it('then it should throw', async () => {
                await resolver
                    .validateAsync(
                        {
                            locationId: 1,
                            quickMessages: [
                                {text: 'Smth 21', locale: 'en_GB'},
                                {text: 'Smth 25', locale: 'es_ES'}
                            ]
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details[0].message).toBe(
                            `"quickMessages" does not contain at least one required match`
                        );
                    });
            });
        });
    });
});
