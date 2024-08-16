let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    resolver = require('./UpdateEULAAcceptanceStatusResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateUserEULAAcceptanceDate: jest.fn(() => new Date('2022-10-27T00:00:00.000Z')),
        updateSessionEula: jest.fn(() => {}),
        updateUserEula: jest.fn()
    }));

    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to update the EULA acceptance status', () => {
    describe('and the user exists and can be updated', () => {
        test('then it should return true', async () => {
            expect(await resolver(null, {acceptedEula: true}, {sessionId: 1, userId: 1})).toBe(
                true
            );
        });

        test('then it should return false if the user does not accept', async () => {
            expect(await resolver(null, {acceptedEula: false}, {sessionId: 1, userId: 1})).toBe(
                false
            );
        });

        test('then it also updates the redis data', async () => {
            await resolver(null, {acceptedEula: true}, {sessionId: 1, userId: 1});
            expect(ohanaSharedPackage.updateSessionEula).toHaveBeenCalled();
            expect(ohanaSharedPackage.updateUserEula).toHaveBeenCalled();
        });
    });

    describe('and the user does not exist and can it cannot be updated', () => {
        test('then it should return false', async () => {
            ohanaSharedPackage.updateUserEULAAcceptanceDate.mockImplementationOnce(() => false);
            expect(await resolver(null, {acceptedEula: true}, {sessionId: 1, userId: 1})).toBe(
                false
            );
        });

        test("then it doesn't make any redis calls", async () => {
            ohanaSharedPackage.updateUserEULAAcceptanceDate.mockImplementationOnce(() => false);
            expect(ohanaSharedPackage.updateSessionEula).not.toHaveBeenCalled();
            expect(ohanaSharedPackage.updateUserEula).not.toHaveBeenCalled();
        });
    });
});
