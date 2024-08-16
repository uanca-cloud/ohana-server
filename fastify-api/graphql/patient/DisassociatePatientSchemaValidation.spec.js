const disassociatePatient = require('./DisassociatePatientSchemaValidation');

describe('Given we want to validate the Graphql schema for disassociatePatient mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await disassociatePatient.validateAsync({patientId: 123});
            expect(result).toEqual(expect.objectContaining({patientId: 123}));
        });
    });

    describe('when an invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await disassociatePatient
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"patientId" is required'));
            });
        });

        describe('and an invalid type is provided', () => {
            it('then it should throw', async () => {
                await disassociatePatient
                    .validateAsync({patientId: '123'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
