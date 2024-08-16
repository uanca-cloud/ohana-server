const updateLocation = require('./UpdateLocationSchemaValidation');

describe('Given we want to validate the Graphql schema for update location mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocation.validateAsync({
                location: {id: 1, label: 'location name'}
            });
            expect(result).toEqual(
                expect.objectContaining({location: {id: 1, label: 'location name'}})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updateLocation
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"location" is required'));
            });
        });

        describe('and invalid arg is provided', () => {
            it('then it should throw', async () => {
                await updateLocation
                    .validateAsync({
                        location: {
                            id: 1,
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
                await updateLocation
                    .validateAsync({location: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"location.id" is required');
                        expect(err.details[1].message).toBe('"location.label" is required');
                    });
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await updateLocation
                    .validateAsync({location: {id: 'ssss', label: 'location name'}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"location.id" must be a number')
                    );
            });
        });
    });
});
