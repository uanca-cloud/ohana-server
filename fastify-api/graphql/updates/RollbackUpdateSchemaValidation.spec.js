const rollbackUpdate = require('./RollbackUpdateSchemaValidation');

describe('Given we want to validate the Graphql schema for rollback update mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await rollbackUpdate.validateAsync({
                encounterId: '382',
                updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce'
            });
            expect(result).toEqual(
                expect.objectContaining({
                    encounterId: '382',
                    updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce'
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await rollbackUpdate.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(2);
                    expect(err.details[0].message).toBe('"encounterId" is required');
                    expect(err.details[1].message).toBe('"updateId" is required');
                });
            });
        });
    });
});
