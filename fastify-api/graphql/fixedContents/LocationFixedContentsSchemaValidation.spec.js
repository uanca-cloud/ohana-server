const locationFixedContents = require('./LocationFixedContentsSchemaValidation');

describe('Given we want to validate the Graphql schema to get a location`s fixed contents', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationFixedContents.validateAsync({locationId: 1});
            expect(result).toEqual(expect.objectContaining({locationId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no locationId is provided', () => {
            it('then it should return the schema', async () => {
                const result = await locationFixedContents.validateAsync({});
                expect(result).toEqual(expect.objectContaining({}));
            });
        });
    });
});
