const createLocation = require('./CreateLocationSchemaValidation');

describe('Given we want to validate the Graphql schema for create location mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await createLocation.validateAsync({location: {label: 'location name'}});
            expect(result).toEqual(expect.objectContaining({location: {label: 'location name'}}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await createLocation
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"location" is required'));
            });
        });

        describe('and invalid arg is provided', () => {
            it('then it should throw', async () => {
                await createLocation
                    .validateAsync({
                        location: {
                            label: 'location name location name location name location name location name location name location name location name location name location name location name location name location name location name location name location name location name'
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"location.label" length must be less than or equal to 100 characters long'
                        );
                    });
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await createLocation.validateAsync({location: {}}).catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe('"location.label" is required');
                });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await createLocation
                    .validateAsync({location: {label: 1}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"location.label" must be a string')
                    );
            });
        });
    });
});
