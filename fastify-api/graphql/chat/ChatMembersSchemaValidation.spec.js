const chatMembers = require('./ChatMembersSchemaValidation');

describe('Given we want to validate the Graphql schema for chat member query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await chatMembers.validateAsync({
                patientId: 123,
                limit: 10,
                offset: 0
            });
            expect(result).toEqual(expect.objectContaining({patientId: 123, limit: 10, offset: 0}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and patientId value is missing', () => {
            it('then it should throw', async () => {
                await chatMembers
                    .validateAsync({limit: 10})
                    .catch((err) => expect(err.details[0].message).toBe('"patientId" is required'));
            });
        });

        describe('and limit value is missing', () => {
            it('then it should throw', async () => {
                await chatMembers
                    .validateAsync({patientId: 123})
                    .catch((err) => expect(err.details[0].message).toBe('"limit" is required'));
            });
        });

        describe('and offset value is missing', () => {
            it('then it should throw', async () => {
                await chatMembers
                    .validateAsync({patientId: 123, limit: 10})
                    .catch((err) => expect(err.details[0].message).toBe('"offset" is required'));
            });
        });
    });

    describe('when invalid types are provided', () => {
        describe('and patientId is not number', () => {
            test('then it should throw', async () => {
                await chatMembers
                    .validateAsync({patientId: '123a-456b', limit: 10, cursor: 'order:123'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });

        describe('and limit is not number', () => {
            test('then it should throw', async () => {
                await chatMembers
                    .validateAsync({patientId: 123, limit: 'abc', cursor: 'order:123'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"limit" must be a number')
                    );
            });
        });

        describe('and offset is not number', () => {
            test('then it should throw', async () => {
                await chatMembers
                    .validateAsync({patientId: 123, limit: 10, offset: 'abc'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"offset" must be a number')
                    );
            });
        });
    });
});
