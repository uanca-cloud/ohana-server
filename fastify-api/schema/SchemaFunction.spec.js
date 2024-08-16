let request = {},
    response = {},
    resolver;
const {
    CONSTANTS: {VERSION_HEADER_NAME, LAST_SUPPORTED_VERSION},
    graphQLSchema
} = require('ohana-shared');

let ohanaSharedPackage;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        isProdEnv: jest.fn()
    }));

    ohanaSharedPackage = require('ohana-shared');

    resolver = require('./SchemaFunction').schemaFunction;

    request = {
        headers: {
            [VERSION_HEADER_NAME]: LAST_SUPPORTED_VERSION
        }
    };

    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to send a request to the schema endpoint', () => {
    describe('Given the clients environment is not external', () => {
        beforeEach(() => {
            ohanaSharedPackage.isProdEnv.mockReturnValue(false);
        });
        test('then it should return status code 403 if the client version is not supported', async () => {
            request.headers[VERSION_HEADER_NAME] = '1.0.0';
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith({
                message: 'Unsupported Version Error',
                code: 'UNSUPPORTED_VERSION_ERROR'
            });
        });

        test('then it should return status code 403 if the client environment is not supported', async () => {
            request.headers[VERSION_HEADER_NAME] = '1.0.0';
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith({
                message: 'Unsupported Version Error',
                code: 'UNSUPPORTED_VERSION_ERROR'
            });
        });

        test('then it should return the GraphQL schema if the client version is supported', async () => {
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(graphQLSchema.schema);
        });
    });

    describe('Given the clients environment is external', () => {
        beforeEach(() => {
            ohanaSharedPackage.isProdEnv.mockReturnValue(true);
        });
        test('then it should return the GraphQL schema if the client version is supported', async () => {
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(404);
            expect(response.send).toHaveBeenCalledWith({
                message: 'Not Found',
                code: 'NOT_FOUND'
            });
        });
    });
});
