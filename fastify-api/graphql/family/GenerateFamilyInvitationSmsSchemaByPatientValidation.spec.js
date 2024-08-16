const generateFamilyInvitationSmsByPatient = require('./GenerateFamilyInvitationSmsSchemaByPatientValidation');

describe('Given we want to validate the Graphql schema for generate family invitation via sms mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await generateFamilyInvitationSmsByPatient.validateAsync({
                patientId: 1,
                phoneNumber: '+000111111111'
            });
            expect(result).toEqual(
                expect.objectContaining({patientId: 1, phoneNumber: '+000111111111'})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await generateFamilyInvitationSmsByPatient
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"patientId" is required');
                    });
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await generateFamilyInvitationSmsByPatient
                    .validateAsync({patientId: 'patientid'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });

        describe('and one arg is missing', () => {
            it('then it should throw', async () => {
                await generateFamilyInvitationSmsByPatient
                    .validateAsync({patientId: 1})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"phoneNumber" is required')
                    );
            });
        });
    });
});
