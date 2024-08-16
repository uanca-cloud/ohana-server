const commitUpdate = require('./CommitUpdateSchemaValidation');

describe('Given we want to validate the Graphql schema for commit update mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await commitUpdate.validateAsync({
                input: {
                    encounterId: '382',
                    updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                    text: 'new update'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        encounterId: '382',
                        updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                        text: 'new update'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and a text too long is provided', () => {
            it('then it should throw', async () => {
                await commitUpdate
                    .validateAsync({
                        input: {
                            encounterId: '382',
                            updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                            text: 'very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last namevery long last name very long last name very long last name very long last name very long last namevery long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name very long last name'
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"input.text" length must be less than or equal to 1024 characters long'
                        );
                    });
            });
        });

        describe('and empty input is provided', () => {
            describe('and no input is provided', () => {
                it('then it should throw', async () => {
                    await commitUpdate
                        .validateAsync({})
                        .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
                });
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await commitUpdate.validateAsync({input: {}}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(2);
                    expect(err.details[0].message).toBe('"input.encounterId" is required');
                    expect(err.details[1].message).toBe('"input.updateId" is required');
                });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await commitUpdate
                    .validateAsync({
                        input: {
                            encounterId: '382',
                            updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                            text: 123
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.text" must be a string')
                    );
            });
        });

        describe('and number is provided as type instead of string', () => {
            it('then it should throw', async () => {
                await commitUpdate
                    .validateAsync({
                        input: {
                            encounterId: '382',
                            updateId: '0297ca6e-29b6-4495-b4ce-7f137a0b0cce',
                            type: 123
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.type" must be a string')
                    );
            });
        });
    });
});
