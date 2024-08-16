const caregiverCreateOrRefreshSession = require('./CaregiverCreateOrRefreshSessionSchemaValidation');

describe('Given we want to validate the Graphql schema for create or refresh session mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await caregiverCreateOrRefreshSession.validateAsync({
                bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                tenantId: '00JL',
                device: {
                    deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone SE',
                    appVersion: '1.0.0',
                    deviceName: 'GW-28209'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({bearerToken: 'eyJhbGciOiJIUzI1NiIs', tenantId: '00JL'})
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await caregiverCreateOrRefreshSession
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"bearerToken" is required');
                        expect(err.details[1].message).toBe('"tenantId" is required');
                        expect(err.details[2].message).toBe('"device" is required');
                    });
            });
        });

        describe('and required arg is missing', () => {
            it('then it should throw', async () => {
                await caregiverCreateOrRefreshSession
                    .validateAsync(
                        {bearerToken: 'eyJhbGciOiJIUzI1NiIs', tenantId: '1', device: {}},
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(4);
                        expect(err.details[0].message).toBe('"device.deviceId" is required');
                        expect(err.details[1].message).toBe('"device.osVersion" is required');
                        expect(err.details[2].message).toBe('"device.deviceModel" is required');
                        expect(err.details[3].message).toBe('"device.appVersion" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await caregiverCreateOrRefreshSession
                    .validateAsync({
                        bearerToken: 11111,
                        tenantId: '00JL',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"bearerToken" must be a string')
                    );
            });
        });

        describe('and invalid tenant id (contains non alphanumeric chars) is provided', () => {
            it('then it should throw', async () => {
                await caregiverCreateOrRefreshSession
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        tenantId: 'c939eeff-296f-4cb6',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"tenantId" must only contain alpha-numeric characters'
                        )
                    );
            });
        });

        describe('and invalid tenant id (longer than 6 chars) is provided', () => {
            it('then it should throw', async () => {
                await caregiverCreateOrRefreshSession
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        tenantId: 'c939eeff4cb6',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"tenantId" length must be less than or equal to 6 characters long'
                        )
                    );
            });
        });
    });
});
