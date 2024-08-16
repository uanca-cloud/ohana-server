const locationQuickMessages = require('./LocationQuickMessagesSchemaValidation');

describe('Given we want to validate the Graphql schema for retrieving location quick messages query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationQuickMessages.validateAsync({locationId: 1});
            expect(result).toEqual(expect.objectContaining({locationId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should return the schema', async () => {
                const result = await locationQuickMessages.validateAsync({});
                expect(result).toEqual(expect.objectContaining({}));
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await locationQuickMessages
                    .validateAsync({locationId: '1'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"locationId" must be a number')
                    );
            });
        });
    });
});
