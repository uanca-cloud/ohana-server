const assignCaregiverToPatientResolver = require('./AssignCaregiverToPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for assign caregiver to patient mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await assignCaregiverToPatientResolver.validateAsync({
                patientId: 1,
                encounterId: 1
            });
            expect(result).toEqual(expect.objectContaining({patientId: 1, encounterId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await assignCaregiverToPatientResolver
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"patientId" is required');
                        expect(err.details[1].message).toBe('"encounterId" is required');
                    });
            });
        });

        describe('and required arg is missing', () => {
            it('then it should throw', async () => {
                await assignCaregiverToPatientResolver
                    .validateAsync({patientId: 1})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"encounterId" is required');
                    });
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await assignCaregiverToPatientResolver
                    .validateAsync({patientId: 'sss'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
