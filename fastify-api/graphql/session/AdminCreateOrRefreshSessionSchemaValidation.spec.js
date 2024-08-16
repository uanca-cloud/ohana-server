const adminCreateOrRefreshSession = require('./AdminCreateOrRefreshSessionSchemaValidation');

describe('Given we want to validate the Graphql schema for create or refresh session mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await adminCreateOrRefreshSession.validateAsync({
                bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                tenantId: '8de62cb2-a34f-4764-81f4'
            });
            expect(result).toEqual(
                expect.objectContaining({
                    bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                    tenantId: '8de62cb2-a34f-4764-81f4'
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await adminCreateOrRefreshSession
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"bearerToken" is required');
                        expect(err.details[1].message).toBe('"tenantId" is required');
                    });
            });
        });

        describe('and required arg is missing', () => {
            it('then it should throw', async () => {
                await adminCreateOrRefreshSession
                    .validateAsync({bearerToken: 'eyJhbGciOiJIUzI1NiIs'})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"tenantId" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await adminCreateOrRefreshSession
                    .validateAsync({bearerToken: 11111, tenantId: '8de62cb2-a34f-4764-81f4'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"bearerToken" must be a string')
                    );
            });
        });
    });
});
