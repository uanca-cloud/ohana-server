const markUpdateAsRead = require('./MarkUpdateAsReadSchemaValidation');

describe('Given we want to validate the Graphql schema for mark update as read query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await markUpdateAsRead.validateAsync({updateIds: ['123']});
            expect(result).toEqual(expect.objectContaining({updateIds: ['123']}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await markUpdateAsRead
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"updateIds" is required'));
            });
        });

        describe('and a string is provided for updatedIds', () => {
            it('then it should throw', async () => {
                await markUpdateAsRead
                    .validateAsync({updateIds: '123'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"updateIds" must be an array')
                    );
            });
        });

        describe('and an array of numbers provided for updatedIds', () => {
            it('then it should throw', async () => {
                await markUpdateAsRead
                    .validateAsync({updateIds: [123]})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"updateIds[0]" must be a string')
                    );
            });
        });
    });
});
