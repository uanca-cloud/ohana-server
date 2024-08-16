const removeFamilyMember = require('./RemoveFamilyMemberSchemaValidation');

describe('Given we want to validate the Graphql schema for remove family member mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await removeFamilyMember.validateAsync({
                userId: '8de62cb2-a34f-4764-81f4-3b47cb9f4759'
            });
            expect(result).toEqual(
                expect.objectContaining({userId: '8de62cb2-a34f-4764-81f4-3b47cb9f4759'})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await removeFamilyMember
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"userId" is required'));
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await removeFamilyMember
                    .validateAsync({userId: 1})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"userId" must be a string')
                    );
            });
        });
    });
});
