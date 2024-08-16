const removeMediaAttachmentOnUpdate = require('./RemoveMediaAttachmentOnUpdateSchemaValidation');

describe('Given we want to validate the Graphql schema for removing an media attachment from an update mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await removeMediaAttachmentOnUpdate.validateAsync({
                input: {
                    encounterId: '1',
                    updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                    filename: '91c60525-5799'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        encounterId: '1',
                        updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                        filename: '91c60525-5799'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await removeMediaAttachmentOnUpdate
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await removeMediaAttachmentOnUpdate
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"input.encounterId" is required');
                        expect(err.details[1].message).toBe('"input.updateId" is required');
                        expect(err.details[2].message).toBe('"input.filename" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await removeMediaAttachmentOnUpdate
                    .validateAsync({
                        input: {
                            encounterId: '382',
                            updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                            filename: '91c60525-5799'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.filename" must be a string')
                    );
            });
        });
    });
});
