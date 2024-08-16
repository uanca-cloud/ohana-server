const addQuickMessageAttachmentOnUpdate = require('./AddQuickMessageAttachmentOnUpdateSchemaValidation');

describe('Given we want to validate the Graphql schema for adding a quick message attachment on an update mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await addQuickMessageAttachmentOnUpdate.validateAsync({
                input: {
                    encounterId: '1',
                    updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                    quickMessageId: '1'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        encounterId: '1',
                        updateId: '91c60525-5799-4073-aa7b-de133c85d235',
                        quickMessageId: '1'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await addQuickMessageAttachmentOnUpdate
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await addQuickMessageAttachmentOnUpdate
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"input.encounterId" is required');
                        expect(err.details[1].message).toBe('"input.updateId" is required');
                        expect(err.details[2].message).toBe('"input.quickMessageId" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await addQuickMessageAttachmentOnUpdate
                    .validateAsync({
                        input: {
                            encounterId: '382',
                            updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                            quickMessageId: '1'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.quickMessageId" must be a string'
                        )
                    );
            });
        });
    });
});
