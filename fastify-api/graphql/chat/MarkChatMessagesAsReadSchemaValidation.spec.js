const markChatMessagesAsRead = require('./MarkChatMessagesAsReadSchemaValidation');

describe('Given we want to validate the Graphql schema for marking a chat message as read mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await markChatMessagesAsRead.validateAsync({
                input: {
                    patientId: 123,
                    orderNumbers: [1, 2, 3]
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        patientId: 123,
                        orderNumbers: [1, 2, 3]
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and patientId value is missing', () => {
            it('then it should throw', async () => {
                await markChatMessagesAsRead
                    .validateAsync({
                        input: {orderNumbers: [1, 2, 3]}
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" is required')
                    );
            });
        });

        describe('and orderNumbers value is missing', () => {
            it('then it should throw', async () => {
                await markChatMessagesAsRead
                    .validateAsync({
                        input: {
                            patientId: 123
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.orderNumbers" is required')
                    );
            });
        });
    });

    describe('when invalid types are provided', () => {
        describe('and patientId is not number', () => {
            test('then it should throw', async () => {
                await markChatMessagesAsRead
                    .validateAsync({
                        input: {
                            patientId: '123a-456b',
                            orderNumbers: [1, 2, 3]
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" must be a number')
                    );
            });
        });

        describe('and orderNumbers is an empty array', () => {
            test('then it should throw', async () => {
                await markChatMessagesAsRead
                    .validateAsync({
                        input: {
                            patientId: 123,
                            orderNumbers: []
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.orderNumbers" must contain at least 1 items'
                        )
                    );
            });
        });

        describe('and orderNumbers is not an array of numbers', () => {
            test('then it should throw', async () => {
                await markChatMessagesAsRead
                    .validateAsync({
                        input: {
                            patientId: 123,
                            orderNumbers: ['abc']
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.orderNumbers[0]" must be a number'
                        )
                    );
            });
        });
    });
});
