let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getUnreadUpdatesByPatientId: jest.fn(() => {
            return 0;
        })
    }));

    resolver = require('./UnreadUpateCountPatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});
afterEach(() => {
    jest.unmock('ohana-shared');
});
describe('Given a Patient and UserId we want to resolve a GQL unread update counts', () => {
    describe('When no Updates are stored', () => {
        test('should compute 0 unread counts for updates', async () => {
            const result = await resolver({id: 1}, null, {
                userId: '123'
            });
            expect(result).toBe(0);
        });
    });
    describe('When some Updates are stored', () => {
        test('should compute the unread counts available for updates', async () => {
            ohanaSharedPackage.getUnreadUpdatesByPatientId.mockImplementationOnce(() => 3);
            const result = await resolver({id: 1}, null, {
                userId: '123'
            });
            expect(result).toBe(3);
        });
    });
});
