process.env.REDIS_CONNECTION_STRING = 'redis://:redispass@localhost:6379';

jest.mock('./shared/logs/LoggingService', () => {
    return {
        getLogger: jest.fn(() => {
            return {
                debug: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn(),
                bindings: jest.fn(),
                client: jest.fn()
            };
        })
    };
});

jest.mock('@azure/web-pubsub', () => ({
    WebPubSubServiceClient: jest.fn()
}));
