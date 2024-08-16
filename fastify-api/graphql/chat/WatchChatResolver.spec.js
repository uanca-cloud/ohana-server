let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            ...jest.requireActual('ohana-shared/constants'),
            DISABLE_CSA_INTEGRATION: false
        },
        getAsyncIterator: jest.fn()
    }));

    resolver = require('./WatchChatResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL subscription to watch chat events', () => {
    describe('when we use the resolve function', () => {
        test('then it should fail for missing auth header', async () => {
            try {
                await resolver.resolve(null, null, {version: undefined});
            } catch (error) {
                expect(error.extensions.code).toBe('UNAUTHENTICATED');
            }
        });

        test('then it should fail for disabled csa', async () => {
            ohanaSharedPackage.CONSTANTS.DISABLE_CSA_INTEGRATION = true;
            try {
                await resolver.resolve(null, null, {
                    userId: 'uuid',
                    deviceId: 'test',
                    role: 'ApprovedUser'
                });
            } catch (error) {
                expect(error.extensions.code).toBe('SERVICE_ERROR');
            }
        });

        test('then it should fail for missing role', async () => {
            try {
                await resolver.resolve(null, null, {
                    userId: 'uuid',
                    deviceId: 'test',
                    role: 'Administrator'
                });
            } catch (error) {
                expect(error.extensions.code).toBe('FORBIDDEN');
            }
        });

        describe('then it should fail for missing device id or user id', () => {
            test('then it should fail for missing device id', async () => {
                try {
                    await resolver.resolve(null, null, {
                        userId: 'uuid',
                        deviceId: null,
                        role: 'ApprovedUser'
                    });
                } catch (error) {
                    expect(error.extensions.code).toBe('BAD_USER_INPUT');
                }
            });

            test('then it should fail for missing user id', async () => {
                try {
                    await resolver.resolve(null, null, {
                        userId: null,
                        deviceId: 'uuid',
                        role: 'ApprovedUser'
                    });
                } catch (error) {
                    expect(error.extensions.code).toBe('UNAUTHENTICATED');
                }
            });
        });

        test('then it returns the payload', async () => {
            const payload = {foo: 'bar'};
            const result = await resolver.resolve(payload, null, {
                userId: 'uuid',
                deviceId: 'uuid',
                role: 'ApprovedUser'
            });
            expect(result).toBe(payload);
        });
    });

    describe('when we use the resolve function', () => {
        test('then it returns the async iterator for the connection', async () => {
            ohanaSharedPackage.getAsyncIterator.mockImplementationOnce(function* () {
                yield true;
                return Promise.resolve(true);
            });
            const result = await resolver.subscribe(null, null, {
                userId: 'uuid',
                deviceId: 'uuid',
                role: 'ApprovedUser'
            });
            expect(result).toBeTruthy();
        });
    });
});
