const eulaValidation = require('./UpdateEULAAcceptanceStatusSchemaValidation');

describe('Given we want to validate the Graphql schema for updateEULAAcceptanceStatus mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await eulaValidation.validateAsync({acceptedEula: true});
            expect(result).toEqual(expect.objectContaining({acceptedEula: true}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await eulaValidation
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"acceptedEula" is required')
                    );
            });
        });

        describe('and number is provided instead of boolean', () => {
            it('then it should throw', async () => {
                await eulaValidation
                    .validateAsync({acceptedEula: 123})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"acceptedEula" must be a boolean')
                    );
            });
        });
    });
});
