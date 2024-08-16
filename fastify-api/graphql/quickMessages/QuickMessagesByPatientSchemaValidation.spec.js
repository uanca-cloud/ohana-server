const quickMessagesByPatient = require('./QuickMessagesByPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for retrieving quick messages for a patient', () => {
    describe('when valid schema is provided', () => {
        test('then it should return the schema', async () => {
            const result = await quickMessagesByPatient.validateAsync({patientId: 1});
            expect(result).toEqual(expect.objectContaining({patientId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            test('then it should throw', async () => {
                await quickMessagesByPatient.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe('"patientId" is required');
                });
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await quickMessagesByPatient
                    .validateAsync({patientId: '1'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
