let extractOhanaId = null,
    locationSettingDao = null,
    isChatEnabled = null,
    removeUserAsChatMember = null,
    removeUsersAsChatMembers = null,
    chatDao = null,
    azurePubSubClient = null,
    tenantHelper = null,
    createUserDictionary = null,
    updateChatNotificationLevel = null;

const patientId = 123,
    location = {id: 1},
    tenantId = '456';

const userData = {
    userId: '123',
    patientUlid: '56789Test',
    tenantShortCode: '12AB',
    deviceId: '1'
};

const usersData = [
    {
        id: 123,
        tenant: {
            id: 1
        },
        patientUlid: 'x9876',
        deviceId: '1'
    },
    {
        id: 456,
        tenant: {
            id: 1
        },
        patientUlid: 'x9876',
        deviceId: '2'
    }
];

beforeEach(() => {
    jest.mock('../location/LocationSettingsDao', () => ({
        getLocationSetting: jest.fn(() => ({key: 'chatLocationEnabled', value: 'true'}))
    }));

    jest.mock('./ChatDao', () => ({
        removeChatMembers: jest.fn(() => Promise.resolve()),
        updateChannelNotificationLevel: jest.fn(() => Promise.resolve())
    }));

    jest.mock('../pubsub/AzurePubSubClient', () => ({
        removeUserFromGroups: jest.fn()
    }));

    jest.mock('../SessionService', () => ({
        setChatCountForPatientId: jest.fn()
    }));

    jest.mock('../user/UserDao', () => ({
        getUsersByIds: jest.fn(() =>
            Promise.resolve([
                {
                    id: '1234',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ApprovedUser'
                }
            ])
        ),
        updateChatNotificationLevelForUser: jest.fn(() => Promise.resolve())
    }));

    jest.mock('../tenant/TenantHelper', () => ({
        getTenantShortCode: jest.fn(() => JSON.stringify('TEST'))
    }));

    jest.mock('../constants', () => ({
        TENANT_IDS_HASH: 'tenant_ids',
        EXTERNAL_ENVIRONMENTS: ['demo', 'stage', 'sandbox', 'prod'],
        DEFAULT_LOG_LEVEL: 'info',
        DISABLE_CSA_INTEGRATION: false,
        LOCATION_SETTINGS_KEYS: {
            CHAT_LOCATION_ENABLED: 'chatLocationEnabled'
        }
    }));

    locationSettingDao = require('../location/LocationSettingsDao');
    chatDao = require('./ChatDao');
    azurePubSubClient = require('../pubsub/AzurePubSubClient');
    tenantHelper = require('../tenant/TenantHelper');

    extractOhanaId = require('./ChatHelper').extractOhanaId;
    isChatEnabled = require('./ChatHelper').isChatEnabled;
    removeUserAsChatMember = require('./ChatHelper').removeUserAsChatMember;
    removeUsersAsChatMembers = require('./ChatHelper').removeUsersAsChatMembers;
    createUserDictionary = require('./ChatHelper').createUserDictionary;
    updateChatNotificationLevel = require('./ChatHelper').updateChatNotificationLevel;
});

afterAll(() => {
    jest.resetAllMocks();
});

describe('Given we want to work with the chat helper file', () => {
    describe('When we extract ohana id from chat id', () => {
        test('then we return the id', () => {
            expect(extractOhanaId('hrc:1234:test_id')).toEqual('test_id');
        });
    });
});

describe('Given we want to know if chat is enabled on a patient and on their location', () => {
    describe('when chat is enabled on both the patient and their location', () => {
        test('then true should be returned', async () => {
            locationSettingDao.getLocationSetting.mockReturnValueOnce(
                Promise.resolve({key: 'chatLocationEnabled', value: 'true'})
            );
            const response = await isChatEnabled(
                {id: patientId, location, enableChat: true},
                tenantId
            );

            expect(locationSettingDao.getLocationSetting).toHaveBeenCalledTimes(1);
            expect(response).toBe(true);
        });
    });

    describe('when chat is not enabled on the patient', () => {
        test('then false should be returned', async () => {
            const response = await isChatEnabled(
                {id: patientId, location, enableChat: false},
                tenantId
            );

            expect(locationSettingDao.getLocationSetting).toHaveBeenCalledTimes(0);
            expect(response).toBe(false);
        });
    });

    describe('when chat is enabled not enabled on the patients location', () => {
        test('then false should be returned', async () => {
            locationSettingDao.getLocationSetting.mockReturnValueOnce(
                Promise.resolve({key: 'chatLocationEnabled', value: 'false'})
            );
            const response = await isChatEnabled(
                {id: patientId, location, enableChat: true},
                tenantId
            );

            expect(locationSettingDao.getLocationSetting).toHaveBeenCalledTimes(1);
            expect(response).toBe(false);
        });
    });
});

describe('Given we want to remove a user from their chat channel', () => {
    describe('when we pass the valid user information and CSA successfully removes the user', () => {
        test('then it should successfully resolve', async () => {
            await expect(
                removeUserAsChatMember(
                    userData.userId,
                    userData.patientUlid,
                    userData.tenantShortCode,
                    userData.deviceId
                )
            ).resolves.not.toThrow();

            expect(chatDao.removeChatMembers).toHaveBeenCalledTimes(1);
            expect(azurePubSubClient.removeUserFromGroups).toHaveBeenCalledTimes(1);
        });
    });

    describe('When deviceId is not sent', () => {
        test('Then removeFromGroup should not be called', async () => {
            await removeUserAsChatMember(
                userData.userId,
                userData.patientUlid,
                userData.tenantShortCode
            );

            expect(chatDao.removeChatMembers).toHaveBeenCalledTimes(1);
            expect(azurePubSubClient.removeUserFromGroups).toHaveBeenCalledTimes(0);
        });
    });
});

describe('Given we want to remove multiple users from their chat channel', () => {
    describe('And DISABLE_CSA_INTEGRATION is set to false', () => {
        describe('when multiple users are ready to be removed from their chat channel', () => {
            describe('when tenant short code is not passed as an argument', () => {
                test('then it should successfully resolve', async () => {
                    await expect(removeUsersAsChatMembers(usersData)).resolves.not.toThrow();

                    expect(tenantHelper.getTenantShortCode).toHaveBeenCalledTimes(1);
                    expect(chatDao.removeChatMembers).toHaveBeenCalledTimes(1);
                    expect(azurePubSubClient.removeUserFromGroups).toHaveBeenCalledTimes(
                        usersData.length
                    );
                });
            });

            describe('when tenant short code is passed as an argument', () => {
                test('then it should successfully resolve', async () => {
                    const tenantShortCode = 'CODE';
                    await expect(
                        removeUsersAsChatMembers(usersData, tenantShortCode)
                    ).resolves.not.toThrow();

                    expect(tenantHelper.getTenantShortCode).toHaveBeenCalledTimes(0);
                    expect(chatDao.removeChatMembers).toHaveBeenCalledTimes(1);
                    expect(azurePubSubClient.removeUserFromGroups).toHaveBeenCalledTimes(
                        usersData.length
                    );
                });
            });

            describe('When deviceId is missing from user data', () => {
                test('then it should successfully resolve and not call removeFromGroup function', async () => {
                    await expect(
                        removeUsersAsChatMembers(
                            [
                                {
                                    id: 123,
                                    tenant: {
                                        id: 1
                                    },
                                    patientUlid: 'x9876'
                                },
                                {
                                    id: 456,
                                    tenant: {
                                        id: 1
                                    },
                                    patientUlid: 'x9876'
                                }
                            ],
                            'CODE'
                        )
                    ).resolves.not.toThrow();

                    expect(chatDao.removeChatMembers).toHaveBeenCalledTimes(1);
                    expect(azurePubSubClient.removeUserFromGroups).toHaveBeenCalledTimes(0);
                });
            });

            describe('When no users have active channels', () => {
                test('Then undefined should be returned', async () => {
                    expect(await removeUsersAsChatMembers([], 'CODE')).toBeUndefined();
                });
            });

            describe('When patientUlid is empty for all users', () => {
                test('Then an empty Map object should be returned', async () => {
                    expect(
                        await removeUsersAsChatMembers(
                            [
                                {
                                    id: 123,
                                    tenant: {
                                        id: 1
                                    },
                                    deviceId: '1'
                                },
                                {
                                    id: 456,
                                    tenant: {
                                        id: 1
                                    },
                                    deviceId: '2'
                                }
                            ],
                            'CODE'
                        )
                    ).toStrictEqual(new Map());
                });
            });
        });
    });

    describe('And DISABLE_CSA_INTEGRATION is set to false', () => {
        test('Then it should return undefined', async () => {
            const response = await removeUsersAsChatMembers(usersData, 'CODE');

            expect(response).toBeUndefined();
        });
    });
});

describe('Given we want to obtain a user dictionary from an array of userIds', () => {
    describe('And the data is valid', () => {
        test('Then it should return the users in a dictionary format', async () => {
            const userMap = new Map();
            userMap.set('1234', {
                id: '1234',
                firstName: 'John',
                lastName: 'Doe',
                role: 'ApprovedUser'
            });
            expect(await createUserDictionary(['1234'])).toStrictEqual(userMap);
        });
    });

    describe('And array lengths do not match', () => {
        test('Then it should throw NotFound error', async () => {
            createUserDictionary([])
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });
});

describe('Given we want to update chat notification level for a user', () => {
    test('Then it should compute successfully', async () => {
        await expect(
            updateChatNotificationLevel({
                patientId: 1,
                userId: '123',
                patientUlid: '56789Test',
                tenantShortCode: '12AB',
                notificationLevel: 'loud'
            })
        ).resolves.not.toThrow();
    });
});
