const locationSettings = require('./LocationSettingsSchemaValidation');

describe('Given we want to validate the Graphql schema for getting the settings of a location', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationSettings.validateAsync({locationId: 1});
            expect(result).toEqual(expect.objectContaining({locationId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await locationSettings
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"locationId" is required')
                    );
            });
        });
    });

    describe('and string is provided instead of number', () => {
        it('then it should throw', async () => {
            await locationSettings
                .validateAsync({locationId: '1'})
                .catch((err) =>
                    expect(err.details[0].message).toBe('"locationId" must be a number')
                );
        });
    });
});
