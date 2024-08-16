const registratioResponse = require('./RegistrationResponseSchemaValidation');

describe('Given we want to validate the Graphql schema for registration challenge query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await registratioResponse.validateAsync({
                invitationToken: 'fff022fc-3cd9-4f90-95b4-34b3637ae8a8',
                challengeStringSigned: 'kmgtoVE6Z6MD8awzQo/RIaHQvd83WbCG',
                publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA'
            });
            expect(result).toEqual(
                expect.objectContaining({
                    invitationToken: 'fff022fc-3cd9-4f90-95b4-34b3637ae8a8',
                    challengeStringSigned: 'kmgtoVE6Z6MD8awzQo/RIaHQvd83WbCG',
                    publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA'
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await registratioResponse.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(3);
                    expect(err.details[0].message).toBe('"invitationToken" is required');
                    expect(err.details[1].message).toBe('"challengeStringSigned" is required');
                    expect(err.details[2].message).toBe('"publicKey" is required');
                });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await registratioResponse
                    .validateAsync({invitationToken: 1})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"invitationToken" must be a string')
                    );
            });
        });
    });
});
