const registrationChallenge = require('./RegistrationChallengeSchemaValidation');

describe('Given we want to validate the Graphql schema for registration challenge query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await registrationChallenge.validateAsync({
                invitationToken: 'fff022fc-3cd9-4f90-95b4-34b3637ae8a8'
            });
            expect(result).toEqual(
                expect.objectContaining({invitationToken: 'fff022fc-3cd9-4f90-95b4-34b3637ae8a8'})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await registrationChallenge
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"invitationToken" is required')
                    );
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await registrationChallenge
                    .validateAsync({invitationToken: 1})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"invitationToken" must be a string')
                    );
            });
        });
    });
});
