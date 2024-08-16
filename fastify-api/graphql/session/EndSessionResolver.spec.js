const {
    CONSTANTS: {
        OHANA_ROLES: {CAREGIVER, ADMINISTRATOR, FAMILY_MEMBER}
    }
} = require('ohana-shared');

let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared/constants'),
            DISABLE_CSA_INTEGRATION: false
        },
        deleteSessionBySessionId: jest.fn(() => ['82b4a340-7856-4cb4-ad23-7486626b63c7']),
        delRedisCollectionData: jest.fn(() => true),
        getRedisHashMap: jest.fn(() => true),
        deleteRedisHashMap: jest.fn(() => true),
        setRedisHashMap: jest.fn(() => true),
        getRedisCollectionData: jest.fn(() => {}),
        removeUserPatientMapping: jest.fn(() => true),
        getPatientsWithChatChannelLinkedToUser: jest.fn(() => Promise.resolve([])),
        removeUserAsChatMember: jest.fn(() => Promise.resolve()),
        removeDeviceInfoByDeviceId: jest.fn(() => Promise.resolve()),
        removeDeviceInfo: jest.fn(() => Promise.resolve()),
        getChatReadReceiptsSubscriptionId: jest.fn(() => Promise.resolve(null)),
        unWatchReadReceipt: jest.fn(() => Promise.resolve()),
        unWatchAllChatSubscriptions: jest.fn(() => Promise.resolve()),
        getDeviceInfo: jest.fn(() => Promise.resolve({registrationId: '1234-567', userId: '123'})),
        createNotificationHub: jest.fn(() => Promise.resolve()),
        deleteRegistration: jest.fn(() => Promise.resolve())
    }));

    resolver = require('./EndSessionResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.clearAllMocks();
});

describe('Given we want to resolve a GQL mutation to end a session', () => {
    describe('when user role is administrator', () => {
        test('then it should return true', async () => {
            const result = await resolver(null, {}, {role: ADMINISTRATOR});

            expect(result).toEqual(true);
        });
    });

    describe('when user role is caregiver', () => {
        describe('when there are remaining sessions left', () => {
            describe('When there are no patients with open chat channels', () => {
                test('then it should not remove user patient mapping', async () => {
                    const result = await resolver(null, {}, {role: CAREGIVER});

                    expect(result).toEqual(true);
                    expect(ohanaSharedPackage.removeUserPatientMapping).toHaveBeenCalledTimes(0);
                    expect(ohanaSharedPackage.removeDeviceInfo).toHaveBeenCalledTimes(0);
                    expect(ohanaSharedPackage.removeDeviceInfoByDeviceId).toHaveBeenCalledTimes(1);
                });
            });

            describe('when there are no remaining sessions left', () => {
                test('then it should not remove user patient mapping', async () => {
                    ohanaSharedPackage.deleteSessionBySessionId.mockImplementationOnce(() => []);

                    const result = await resolver(null, {}, {role: CAREGIVER});

                    expect(result).toEqual(true);
                    expect(ohanaSharedPackage.removeUserPatientMapping).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.removeDeviceInfo).toHaveBeenCalledTimes(1);
                    expect(ohanaSharedPackage.removeDeviceInfoByDeviceId).toHaveBeenCalledTimes(0);
                });
            });

            describe('When there are patients with open chat channels', () => {
                test('then it should not remove user patient mapping', async () => {
                    ohanaSharedPackage.deleteSessionBySessionId.mockImplementationOnce(() => []);
                    ohanaSharedPackage.getPatientsWithChatChannelLinkedToUser.mockImplementationOnce(
                        () => [
                            {
                                id: '1',
                                externalId: 'MRN1',
                                externalIdType: 'MRN',
                                firstName: 'Test',
                                lastName: 'Test',
                                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
                            }
                        ]
                    );
                    const result = await resolver(null, {}, {role: CAREGIVER});

                    expect(result).toEqual(true);
                    expect(ohanaSharedPackage.removeUserAsChatMember).toHaveBeenCalledTimes(1);
                });
            });
        });
    });

    describe('when user role is family member', () => {
        describe('when there are remaining sessions left', () => {
            test('then it should return true', async () => {
                const result = await resolver(null, {}, {role: FAMILY_MEMBER});

                expect(result).toEqual(true);
                expect(ohanaSharedPackage.removeUserPatientMapping).toHaveBeenCalledTimes(0);
            });
        });

        describe('when there are no remaining sessions left', () => {
            test('then it should return true', async () => {
                ohanaSharedPackage.deleteSessionBySessionId.mockImplementationOnce(() => []);
                const result = await resolver(null, {}, {role: FAMILY_MEMBER});

                expect(result).toEqual(true);
                expect(ohanaSharedPackage.removeUserPatientMapping).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('when user has an active read receipts subscription to csa', () => {
        test('then it should unsubscribe', async () => {
            ohanaSharedPackage.getChatReadReceiptsSubscriptionId.mockImplementationOnce(
                () => '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            );
            ohanaSharedPackage.deleteSessionBySessionId.mockImplementationOnce(() => []);

            const result = await resolver(null, {}, {role: FAMILY_MEMBER});

            expect(result).toEqual(true);
            expect(ohanaSharedPackage.unWatchReadReceipt).toHaveBeenCalledTimes(1);
        });
    });

    describe('when a user device exists', () => {
        describe('and it has a registration id', () => {
            it('then it should delete the device registration from notification hub', async () => {
                await resolver(null, {}, {role: CAREGIVER});

                expect(ohanaSharedPackage.deleteRegistration).toHaveBeenCalled();
            });
        });

        describe('and it does not have a registration id', () => {
            it('then it should not delete the device registration from notification hub', async () => {
                ohanaSharedPackage.getDeviceInfo.mockImplementationOnce(() => Promise.resolve({}));

                await resolver(null, {}, {role: CAREGIVER});

                expect(ohanaSharedPackage.deleteRegistration).not.toHaveBeenCalled();
            });
        });
    });
});
