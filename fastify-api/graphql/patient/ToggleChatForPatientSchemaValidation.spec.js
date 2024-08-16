const toggleChatForPatient = require('./ToggleChatForPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for the toggleChatForPatient query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await toggleChatForPatient.validateAsync({
                input: {patientId: 1, chatPatientEnabled: false}
            });
            expect(result).toEqual(
                expect.objectContaining({input: {patientId: 1, chatPatientEnabled: false}})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await toggleChatForPatient
                    .validateAsync({input: {}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" is required')
                    );
            });
        });

        describe('and an invalid type is provided', () => {
            it('then it should throw', async () => {
                await toggleChatForPatient
                    .validateAsync({input: {patientId: 123, chatPatientEnabled: 123}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.chatPatientEnabled" must be a boolean'
                        )
                    );
                await toggleChatForPatient
                    .validateAsync({input: {patientId: '123asd', chatPatientEnabled: false}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" must be a number')
                    );
            });
        });
    });
});
