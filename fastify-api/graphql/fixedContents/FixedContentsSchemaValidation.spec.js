const fixedContents = require('./FixedContentsSchemaValidation');

describe('Given we want to validate the Graphql schema to get a location`s fixed contents', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await fixedContents.validateAsync({locationId: 1});
            expect(result).toEqual(expect.objectContaining({locationId: 1}));
        });
    });

    describe('when null is provided as a locationId', () => {
        it('then it should return the schema', async () => {
            const result = await fixedContents.validateAsync({locationId: null});
            expect(result).toEqual(expect.objectContaining({locationId: null}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and locationId is string', () => {
            it('then it should throw', async () => {
                await fixedContents
                    .validateAsync({locationId: 'abc'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"locationId" must be a number')
                    );
            });
        });
    });
});
