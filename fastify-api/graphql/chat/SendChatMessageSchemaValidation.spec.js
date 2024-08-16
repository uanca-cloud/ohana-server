const sendChatMessage = require('./SendChatMessageSchemaValidation');

describe('Given we want to validate the Graphql schema for sending a chat message mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await sendChatMessage.validateAsync({
                input: {
                    patientId: 1,
                    text: 'test',
                    metadata:
                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        patientId: 1,
                        text: 'test',
                        metadata:
                            '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await sendChatMessage
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await sendChatMessage
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => expect(err.details.length).toBe(3));
            });
        });

        describe('and args from input are missing', () => {
            describe('and patientId is missing', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    text: 'test',
                                    metadata:
                                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.patientId" is required')
                        );
                });
            });

            describe('and text is missing', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: 1,
                                    metadata:
                                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.text" is required')
                        );
                });
            });

            describe('and metadata is missing', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: 1,
                                    text: 'test'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.metadata" is required')
                        );
                });
            });
        });

        describe('and args from input are invalid', () => {
            describe('and patientId is not number', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: '1234',
                                    text: 'test',
                                    metadata:
                                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.patientId" must be a number'
                            )
                        );
                });
            });

            describe('and text is number', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: 1,
                                    text: 123,
                                    metadata:
                                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.text" must be a string')
                        );
                });
            });

            describe('and text is longer than 1024 characters', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: 1,
                                    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                                    metadata:
                                        '"{\\"1.2.3.4.5.6.1234.1.2.3\\": {\\"mobileMessageId\\": \\"1234\\"}}"'
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.text" length must be less than or equal to 1024 characters long'
                            )
                        );
                });
            });

            describe('and metadata is number', () => {
                it('then it should throw', async () => {
                    await sendChatMessage
                        .validateAsync(
                            {
                                input: {
                                    patientId: 1,
                                    text: 'test',
                                    metadata: 1
                                }
                            },
                            {abortEarly: false}
                        )
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.metadata" must be a string')
                        );
                });
            });
        });
    });
});
