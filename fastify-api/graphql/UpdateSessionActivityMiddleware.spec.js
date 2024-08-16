let resolver = null,
    cb = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updateSession: jest.fn(() => Promise.resolve)
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

    resolver = require('./UpdateSessionActivityMiddleware');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock();
});

describe('Given we want to resolve a GQL mutation to update a session activity middleware', () => {
    describe('given an input is provided for a Query', () => {
        const context = {
            sessionId: '123',
            role: 'Authenticated User',
            userId: '5678',
            sessionInactivityTimeoutInSecs: '6000'
        };
        const parent = 'test';
        const args = {};
        const info = {};

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

    describe('given an input is provided for a Mutation', () => {
        const context = {
            sessionId: '123',
            role: 'Authenticated User',
            userId: '5678',
            sessionInactivityTimeoutInSecs: '6000'
        };
        const parent = 'test';
        const args = {};
        const info = {};

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
});
