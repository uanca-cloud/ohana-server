const removeLocation = require('./RemoveLocationSchemaValidation');

describe('Given we want to validate the Graphql schema for remove location mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await removeLocation.validateAsync({id: 1});
            expect(result).toEqual(expect.objectContaining({id: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await removeLocation
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"id" is required'));
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await removeLocation
                    .validateAsync({id: 'ssss'})
                    .catch((err) => expect(err.details[0].message).toBe('"id" must be a number'));
            });
        });
    });
});
