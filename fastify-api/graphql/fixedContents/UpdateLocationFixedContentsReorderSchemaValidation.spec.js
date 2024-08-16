const locationFixedContents = require('./UpdateLocationFixedContentsReorderSchemaValidation');

describe('Given we want to validate the Graphql schema to reorder a location`s fixed contents', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationFixedContents.validateAsync({
                locationId: 1,
                fixedContentsOrder: [1, 2, 3]
            });
            expect(result).toEqual({
                locationId: 1,
                fixedContentsOrder: [1, 2, 3]
            });
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe('"fixedContentsOrder" is required');
                });
            });
        });

        describe('and incomplete fixedContentsOrder is provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents
                    .validateAsync({locationId: 1, fixedContentsOrder: []}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"fixedContentsOrder" is required');
                    });
            });
        });

        describe('and invalid types are provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents
                    .validateAsync(
                        {
                            locationId: 'abc',
                            fixedContentsOrder: ['a']
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"locationId" must be a number');
                        expect(err.details[1].message).toBe(
                            '"fixedContentsOrder[0]" must be a number'
                        );
                    });
            });
        });
    });
});
