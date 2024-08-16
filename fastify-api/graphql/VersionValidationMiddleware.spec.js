let resolver = null,
    cb = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        ltLastSupportedVersion: jest.fn(() => false),
        UnsupportedVersionError: jest.fn(() => {
            throw new Error();
        })
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

    resolver = require('./VersionValidationMiddleware');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock();
});

describe('Given we want to resolve a GQL mutation to check that the version is valid', () => {
    describe('given an input is provided for a Query and the version is valid', () => {
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

    describe('given an input is provided for a Query and the version is not valid', () => {
        const context = {
            sessionId: '123',
            role: 'Authenticated User',
            userId: '5678',
            sessionInactivityTimeoutInSecs: '6000',
            version: 1
        };
        const parent = 'test',
            args = {},
            info = {};

        test('then it should return the correct info', async () => {
            ohanaSharedPackage.ltLastSupportedVersion.mockImplementation(() => true);

            await expect(resolver.Query.patient(cb, parent, args, context, info)).rejects.toThrow();
        });
    });

    describe('given input is provided for a Mutation and the version is valid', () => {
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

    describe('given an input is provided for a Mutation and the version is not valid', () => {
        const context = {
            sessionId: '123',
            role: 'Authenticated User',
            userId: '5678',
            sessionInactivityTimeoutInSecs: '6000',
            version: 1
        };
        const parent = 'test',
            args = {},
            info = {};

        test('then it should return the correct info', async () => {
            ohanaSharedPackage.ltLastSupportedVersion.mockImplementation(() => true);

            await expect(
                resolver.Mutation.updatePushNotificationsConfig(cb, parent, args, context, info)
            ).rejects.toThrow();
        });
    });
});
