const authenticationResponse = require('./AuthenticationResponseSchemaValidation');

describe('Given we want to validate the Graphql schema for authentication response mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await authenticationResponse.validateAsync({
                challengeStringSigned:
                    'O6Rj1f9okzM6Y2bCRcPJowolBoRUPnLDlxV+5Wp3abrkVkig0+dMCUZs+A7Dgbu1QUd1vTjnd7TRlVT4ucV',
                userId: '8de62cb2-a34f-4764-81f4-3b47cb9f4759',
                device: {
                    deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                    osVersion: 'Ios-14',
                    deviceModel: 'Iphone SE',
                    appVersion: '1.0.0',
                    deviceName: 'GW-28209'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    challengeStringSigned:
                        'O6Rj1f9okzM6Y2bCRcPJowolBoRUPnLDlxV+5Wp3abrkVkig0+dMCUZs+A7Dgbu1QUd1vTjnd7TRlVT4ucV',
                    userId: '8de62cb2-a34f-4764-81f4-3b47cb9f4759',
                    device: {
                        deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                        osVersion: 'Ios-14',
                        deviceModel: 'Iphone SE',
                        appVersion: '1.0.0',
                        deviceName: 'GW-28209'
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no schema is provided', () => {
            it('then it should throw', async () => {
                await authenticationResponse.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(3);
                    expect(err.details[0].message).toBe('"challengeStringSigned" is required');
                });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await authenticationResponse
                    .validateAsync({
                        challengeStringSigned: 1,
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0',
                            deviceName: 'GW-28209'
                        }
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe(
                            '"challengeStringSigned" must be a string'
                        )
                    );
            });
        });

        describe('and one arg is missing', () => {
            it('then it should throw', async () => {
                await authenticationResponse
                    .validateAsync({
                        challengeStringSigned: 'O6Rj1f9okzM6Y2bCRcPJowolBoRUPnLDlxV+5Wp3abrkVkig0+',
                        device: {
                            deviceId: 'c939eeff-296f-4cb6-9770-5c1b403602a7',
                            osVersion: 'Ios-14',
                            deviceModel: 'Iphone SE',
                            appVersion: '1.0.0',
                            deviceName: 'GW-28209'
                        }
                    })
                    .catch((err) => expect(err.details[0].message).toBe('"userId" is required'));
            });
        });
    });
});
