let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        removeUserPatientMappingsByUserIds: jest.fn(),
        removeDeviceInfosByUserIds: jest.fn(),
        bootstrapAzf: jest.fn(() => {}),
        refreshSessionIndex: jest.fn(() => []),
        runWithTransaction: (cb) => cb({}),
        CONSTANTS: {
            DB_CONNECTION_POOLS: {DEFAULT: 'default'}
        },
        getDatabasePool: jest.fn(),
        getPatientsWithChatChannelLinkedToUser: jest.fn(() => Promise.resolve([])),
        removeChatMembers: jest.fn(() => Promise.resolve()),
        unWatchAllChatSubscriptions: jest.fn(() => Promise.resolve()),
        createNotificationHub: jest.fn(() => Promise.resolve()),
        deleteRegistration: jest.fn(() => Promise.resolve()),
        getDeviceInfoForUsers: jest.fn(() =>
            Promise.resolve([{userId: '1234', registrationId: '1234-5678'}])
        )
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CleanupCaregiverAssociatesScheduledFunction');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.clearAllMocks();
});

describe('Given we want to remove associated caregivers', () => {
    describe('given there are no associated caregivers', () => {
        const myTimer = {
            scheduleStatus: {
                lastUpdated: '01-01-2023'
            }
        };

        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then refreshSessionIndex should be called', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.refreshSessionIndex).toBeCalledTimes(1);
        });

        test('then deleteMultipleUserPatientMappings should never be called', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.removeUserPatientMappingsByUserIds).not.toBeCalled();
        });
    });

    describe('given there are associated caregivers', function () {
        const myTimer = {
            scheduleStatus: {
                lastUpdated: '01-01-2023'
            }
        };

        describe('and there are caregiver devices registered in notification hub', () => {
            test('then it should remove the device from notification hub', async () => {
                ohanaSharedPackage.refreshSessionIndex.mockImplementation(() => {
                    return ['12345'];
                });

                await resolver(null, myTimer);

                expect(ohanaSharedPackage.deleteRegistration).toHaveBeenCalled();
            });
        });

        describe('and there are no registered caregiver devices', () => {
            test('then it should not remove the device from notification hub', async () => {
                ohanaSharedPackage.refreshSessionIndex.mockImplementation(() => {
                    return ['12345'];
                });
                ohanaSharedPackage.getDeviceInfoForUsers.mockImplementationOnce(() =>
                    Promise.resolve([])
                );

                await resolver(null, myTimer);

                expect(ohanaSharedPackage.deleteRegistration).not.toHaveBeenCalled();
            });
        });

        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then refreshSessionIndex should be called', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.refreshSessionIndex).toBeCalledTimes(1);
        });

        test('then deleteMultipleUserPatientMappings should be called', async () => {
            ohanaSharedPackage.refreshSessionIndex.mockImplementation(() => {
                return ['12345'];
            });
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.removeUserPatientMappingsByUserIds).toBeCalledTimes(1);
            expect(ohanaSharedPackage.removeDeviceInfosByUserIds).toBeCalledTimes(1);
        });

        describe('Given there are patients with open chat channels linked to the caregiver', () => {
            test('then removeChatMembers should be called', async () => {
                ohanaSharedPackage.refreshSessionIndex.mockImplementation(() => {
                    return ['12345'];
                });
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
                await resolver(null, myTimer);

                expect(ohanaSharedPackage.removeChatMembers).toBeCalledTimes(1);
            });
        });
    });
});
