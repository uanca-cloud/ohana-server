const createUpdate = require('./CreateUpdateSchemaValidation');

describe('Given we want to validate the Graphql schema for create update mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await createUpdate.validateAsync({encounterId: '382'});
            expect(result).toEqual(expect.objectContaining({encounterId: '382'}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await createUpdate
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"encounterId" is required')
                    );
            });
        });
    });
});
