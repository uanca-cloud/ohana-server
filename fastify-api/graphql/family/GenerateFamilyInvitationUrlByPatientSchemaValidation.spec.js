const generateFamilyInvitationUrlByPatient = require('./GenerateFamilyInvitationUrlByPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for generate family invitation via qr code mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await generateFamilyInvitationUrlByPatient.validateAsync({patientId: 1});
            expect(result).toEqual(expect.objectContaining({patientId: 1}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await generateFamilyInvitationUrlByPatient
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"patientId" is required'));
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await generateFamilyInvitationUrlByPatient
                    .validateAsync({patientId: 'encounterid'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
