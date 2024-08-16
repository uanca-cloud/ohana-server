let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        setRedisCollectionData: jest.fn(() => {}),
        isClosedEncounter: jest.fn(() => false),
        isUserMappedToPatient: jest.fn(() => Promise.resolve(true)),
        getPatientByEncounterId: jest.fn(() => Promise.resolve({id: 123})),
        writeLog: jest.fn(() => {})
    }));

    jest.mock('uuid', () => ({
        v4: jest.fn(() => 'ee96bede-e658-4fbe-b483-4f8748242914')
    }));

    resolver = require('./CreateUpdateResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./CreateUpdateResolver');
    jest.unmock('ohana-shared');
    jest.unmock('uuid');
});

describe('Given we want to resolve a GQL mutation to create an update', () => {
    describe('when valid input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(
                null,
                {
                    encounterId: 1
                },
                {}
            );

            expect(result.id).toBe('ee96bede-e658-4fbe-b483-4f8748242914');
        });
    });

    describe('when encounter is closed', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.isClosedEncounter.mockImplementationOnce(() => true);

            resolver(
                null,
                {
                    encounterId: 1
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });

    describe('when no patient is found for that encounter', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientByEncounterId.mockImplementationOnce(() =>
                Promise.resolve(null)
            );

            resolver(
                null,
                {
                    encounterId: 1
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('NOT_FOUND');
                    expect(e.extensions.description).toBe('Patient not found');
                });
        });
    });

    describe("when creating an update for a family member with which you don't share a patient", () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.isUserMappedToPatient.mockImplementationOnce(() =>
                Promise.resolve(false)
            );

            resolver(
                null,
                {
                    encounterId: 1
                },
                {}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.extensions.code).toBe('FORBIDDEN');
                });
        });
    });
});
