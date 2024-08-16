const patient = require('./PatientSchemaValidation');

describe('Given we want to validate the Graphql schema for patient query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await patient.validateAsync({externalId: '123', patientId: 321});
            expect(result).toEqual(expect.objectContaining({externalId: '123', patientId: 321}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await patient
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"value" must contain at least one of [patientId, externalId]'
                        )
                    );
            });
        });

        describe('and an invalid type is provided', () => {
            it('then it should throw', async () => {
                await patient
                    .validateAsync({externalId: 123})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"externalId" must be a string')
                    );
                await patient
                    .validateAsync({patientId: '123asd'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
