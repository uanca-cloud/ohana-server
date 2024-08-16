const chatHsitory = require('./ChatHistorySchemaValidation');

describe('Given we want to validate the Graphql schema for patient query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await chatHsitory.validateAsync({patientId: 123, limit: 10, cursor: 'order:123'});
            expect(result).toEqual(expect.objectContaining({patientId: 123, limit: 10, cursor: 'order:123'}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and patientId value is missing', () => {
            it('then it should throw', async () => {
                await chatHsitory
                  .validateAsync({limit: 10})
                  .catch((err) =>
                    expect(err.details[0].message).toBe(
                      '"patientId" is required'
                    )
                  );
            });
        });

        describe('and limit value is missing', () => {
            it('then it should throw', async () => {
                await chatHsitory
                  .validateAsync({patientId: 123})
                  .catch((err) =>
                    expect(err.details[0].message).toBe(
                      '"limit" is required'
                    )
                  );
            });
        });
    });

    describe('when invalid types are provided', () => {
        describe('and patientId is not number', () => {
            test('then it should throw', async () => {
                await chatHsitory
                  .validateAsync({patientId: '123a-456b', limit: 10, cursor: 'order:123'})
                  .catch((err) =>
                    expect(err.details[0].message).toBe(
                      '"patientId" must be a number'
                    )
                  );
            })
        });

        describe('and limit is not number', () => {
            test('then it should throw', async () => {
                await chatHsitory
                  .validateAsync({patientId: 123, limit: 'abc', cursor: 'order:123'})
                  .catch((err) =>
                    expect(err.details[0].message).toBe(
                      '"limit" must be a number'
                    )
                  );
            })
        });

        describe('and cursor is not string', () => {
            test('then it should throw', async () => {
                await chatHsitory
                  .validateAsync({patientId: 123, limit: 10, cursor: 1})
                  .catch((err) =>
                    expect(err.details[0].message).toBe(
                      '"cursor" must be a string'
                    )
                  );
            })
        })
    });
});