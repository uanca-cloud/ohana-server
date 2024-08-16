let resolver = null,
    cb = null,
    ohanaSharedPackage;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getSession: jest.fn(() => Promise.resolve(true))
    }));

    cb = jest.fn(() => {
        return {
            parent: 'test',
            args: {
                args1: 'arg'
            },
            context: {
                sessionId: '123',
                role: 'Authenticated User',
                userId: '5678',
                sessionInactivityTimeoutInSecs: '6000'
            },
            info: {
                info1: 'info'
            }
        };
    });

    resolver = require('./CreateUserContextMiddleware');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('./CreateUserContextMiddleware');
    jest.unmock('ohana-shared');
});

describe('Given we want to create user context for a Query', () => {
    const context = {
        sessionId: '123',
        role: 'Authenticated User',
        userId: '5678',
        sessionInactivityTimeoutInSecs: '6000'
    };
    const parent = 'test';
    const args = {args1: 'arg'};
    const info = {info1: 'info'};

    describe('given there are no errors', () => {
        test('then it should return the correct parent', async () => {
            const result = await resolver.Query.patient(cb, parent, args, context, info);

            expect(result.parent).toBe('test');
        });

        test('then it should return the correct args', async () => {
            const result = await resolver.Query.patient(cb, parent, args, context, info);
            expect(result.args.args1).toBe('arg');
        });

        test('then it should return the correct context', async () => {
            const result = await resolver.Query.patient(cb, parent, args, context, info);

            expect(result.context.sessionId).toBe('123');
            expect(result.context.role).toBe('Authenticated User');
            expect(result.context.userId).toBe('5678');
            expect(result.context.sessionInactivityTimeoutInSecs).toBe('6000');
        });

        test('then it should return the correct info', async () => {
            const result = await resolver.Query.patient(cb, parent, args, context, info);

            expect(result.info.info1).toBe('info');
        });
    });

    describe('given there are errors', () => {
        test('then an error should be thrown', async () => {
            cb.mockImplementation(() => {
                throw new Error('my error');
            });
            await expect(resolver.Query.patient(cb, parent, args, context, info)).rejects.toThrow();
        });
    });

    describe('When there is no user for the provided session id', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getSession.mockResolvedValueOnce(null);
            await expect(resolver.Query.patient(cb, parent, args, context, info)).rejects.toThrow();
        });
    });
});

describe('Given we want to create user context for a Mutation', () => {
    const context = {
        sessionId: '123',
        role: 'Authenticated User',
        userId: '5678',
        sessionInactivityTimeoutInSecs: '6000'
    };
    const parent = 'test';
    const args = {args1: 'arg'};
    const info = {info1: 'info'};

    describe('given there are no errors', () => {
        test('then it should return the correct parent', async () => {
            const result = await resolver.Mutation.updatePushNotificationsConfig(
                cb,
                parent,
                args,
                context,
                info
            );

            expect(result.parent).toBe('test');
        });

        test('then it should return the correct args', async () => {
            const result = await resolver.Mutation.updatePushNotificationsConfig(
                cb,
                parent,
                args,
                context,
                info
            );
            expect(result.args.args1).toBe('arg');
        });

        test('then it should return the correct context', async () => {
            const result = await resolver.Mutation.updatePushNotificationsConfig(
                cb,
                parent,
                args,
                context,
                info
            );

            expect(result.context.sessionId).toBe('123');
            expect(result.context.role).toBe('Authenticated User');
            expect(result.context.userId).toBe('5678');
            expect(result.context.sessionInactivityTimeoutInSecs).toBe('6000');
        });

        test('then it should return the correct info', async () => {
            const result = await resolver.Mutation.updatePushNotificationsConfig(
                cb,
                parent,
                args,
                context,
                info
            );

            expect(result.info.info1).toBe('info');
        });
    });

    describe('given there are errors', () => {
        test('then an error should be thrown', async () => {
            cb.mockImplementation(() => {
                throw new Error('my error');
            });
            await expect(
                resolver.Mutation.updatePushNotificationsConfig(cb, parent, args, context, info)
            ).rejects.toThrow();
        });
    });
});
