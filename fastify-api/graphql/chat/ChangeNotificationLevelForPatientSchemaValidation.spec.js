const changeNotificationLevelForPatientSchemaValidationSpec = require('./ChangeNotificationLevelForPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for patient query', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result =
                await changeNotificationLevelForPatientSchemaValidationSpec.validateAsync({
                    input: {
                        patientId: 1,
                        notificationLevel: 'loud'
                    }
                });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        patientId: 1,
                        notificationLevel: 'loud'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and patientId is missing', () => {
            it('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({
                        input: {
                            notificationLevel: 'loud'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" is required')
                    );
            });
        });

        describe('and notificationLevel is missing', () => {
            it('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({
                        input: {
                            patientId: 1
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.notificationLevel" is required')
                    );
            });
        });

        describe('and input is missing', () => {
            it('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({
                        patientId: 1,
                        notificationLevel: 'loud'
                    })
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });
    });

    describe('when invalid types are provided', () => {
        describe('and patientId is not number', () => {
            test('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({input: {patientId: '123a-456b', notificationLevel: 'loud'}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"input.patientId" must be a number')
                    );
            });
        });

        describe('and notificationLevel is not string', () => {
            test('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({input: {patientId: 123, notificationLevel: 1}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.notificationLevel" must be one of [loud, mute]'
                        )
                    );
            });
        });

        describe('and notificationLevel has a different value then the expected ones', () => {
            test('then it should throw', async () => {
                await changeNotificationLevelForPatientSchemaValidationSpec
                    .validateAsync({input: {patientId: 123, notificationLevel: 'normal'}})
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"input.notificationLevel" must be one of [loud, mute]'
                        )
                    );
            });
        });
    });
});
