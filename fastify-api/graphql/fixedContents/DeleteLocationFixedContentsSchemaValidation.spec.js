const locationFixedContents = require('./DeleteLocationFixedContentsSchemaValidation');

describe('Given we want to validate the Graphql schema to delete a location`s fixed contents', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationFixedContents.validateAsync({
                fixedContentId: 1
            });
            expect(result).toEqual({
                fixedContentId: 1
            });
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no fixedContentId is provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe('"fixedContentId" is required');
                });
            });
        });

        describe('and fixedContentId is not a number', () => {
            it('then it should throw', async () => {
                await locationFixedContents
                    .validateAsync({fixedContentId: 'abc'}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"fixedContentId" must be a number');
                    });
            });
        });
    });
});
