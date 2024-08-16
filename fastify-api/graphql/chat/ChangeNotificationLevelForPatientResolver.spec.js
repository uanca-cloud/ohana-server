let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        hasOpenEncounter: jest.fn(() => Promise.resolve(true)),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        getPatientById: jest.fn(() =>
            Promise.resolve({
                patientId: 1,
                patientUlid: '01HKA8YK4KBFBXBXZH1GXBKQNQ'
            })
        ),
        updateChatNotificationLevel: jest.fn(() => Promise.resolve(true)),
        publishMuteChatNotifications: jest.fn(() => {})
    }));

    resolver = require('./ChangeNotificationLevelForPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to update the chat channel notification level for a caregiver', () => {
    describe('When valid input is provided', () => {
        test('Then it should return the updated notificationLevel', async () => {
            const result = await resolver(
                null,
                {input: {patientId: 1, notificationLevel: 'loud'}},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            );

            expect(result).toStrictEqual('loud');
        });
    });

    describe('When no open encounter exists for that patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.hasOpenEncounter.mockImplementationOnce(() => null);

            resolver(
                null,
                {input: {patientId: 1, notificationLevel: 'loud'}},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });

    describe('When user is not mapped to patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() => null);

            resolver(
                null,
                {input: {patientId: 1, notificationLevel: 'loud'}},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('When channel was not created for this patient', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientById.mockImplementationOnce(() =>
                Promise.resolve({
                    patientId: 1,
                    patientUlid: null
                })
            );

            resolver(
                null,
                {input: {patientId: 1, notificationLevel: 'loud'}},
                {tenantId: '1234-abc', userId: '123', mappedPatients: [1], tenantShortCode: '0000'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                });
        });
    });
});
