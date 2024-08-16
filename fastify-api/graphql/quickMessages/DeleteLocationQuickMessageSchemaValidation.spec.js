const deleteLocationQuickMessage = require('./DeleteLocationQuickMessageSchemaValidation');

describe('Given we want to validate the Graphql schema for deleting location quick messages query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await deleteLocationQuickMessage.validateAsync({messageId: 1});
            expect(result).toEqual(expect.objectContaining({messageId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await deleteLocationQuickMessage
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"messageId" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await deleteLocationQuickMessage
                    .validateAsync({messageId: '1'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"messageId" must be a number')
                    );
            });
        });
    });
});
