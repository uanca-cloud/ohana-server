const updatePushNotificationsConfig = require('./UpdatePushNotificationsConfigResolverSchemaValidation');

describe('Given we want to validate the Graphql schema for save device mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updatePushNotificationsConfig.validateAsync({
                config: {
                    deviceId: '8de62cb2',
                    deviceName: 'GW-228904',
                    deviceToken: 'adasdadrgnlsmsoiajfbwe',
                    partialKey: 'YWFhYWFhYWFhYWFhYWFhYQ==',
                    notificationPlatform: 'gcm'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    config: {
                        deviceToken: 'adasdadrgnlsmsoiajfbwe',
                        deviceName: 'GW-228904',
                        partialKey: 'YWFhYWFhYWFhYWFhYWFhYQ==',
                        notificationPlatform: 'gcm',
                        deviceId: '8de62cb2'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updatePushNotificationsConfig
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"config" is required'));
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await updatePushNotificationsConfig
                    .validateAsync(
                        {config: {deviceId: '8de62cb2', deviceToken: 'adasdadrgnlsmsoiajfbwe'}},
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"config.partialKey" is required');
                        expect(err.details[1].message).toBe(
                            '"config.notificationPlatform" is required'
                        );
                    });
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await updatePushNotificationsConfig
                    .validateAsync({config: {}}, {abortEarly: false})
                    .catch((err) => expect(err.details.length).toBe(4));
            });
        });
    });
});
