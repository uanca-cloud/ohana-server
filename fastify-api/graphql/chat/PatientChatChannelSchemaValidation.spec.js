const patientChatChannel = require('./PatientChatChannelSchemaValidation');

describe('Given we want to validate the Graphql schema for patient chat channel query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await patientChatChannel.validateAsync({
                patientId: 123
            });
            expect(result).toEqual(expect.objectContaining({patientId: 123}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and patientId value is missing', () => {
            it('then it should throw', async () => {
                await patientChatChannel
                    .validateAsync({limit: 10})
                    .catch((err) => expect(err.details[0].message).toBe('"patientId" is required'));
            });
        });
    });

    describe('when invalid types are provided', () => {
        describe('and patientId is not number', () => {
            test('then it should throw', async () => {
                await patientChatChannel
                    .validateAsync({patientId: '123a-456b'})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"patientId" must be a number')
                    );
            });
        });
    });
});
