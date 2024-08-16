let pako = null,
    request = {},
    resolver,
    gzipRequest = {};

const mockOhanaShared = (mockDisableClientLogs, mockGetSessionResponse) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getSession: jest.fn(() => Promise.resolve(mockGetSessionResponse)),
        bootstrapClientLogUpload: jest.fn(() => Promise.resolve()),
        CONSTANTS: {
            DISABLE_CLIENT_LOGS: mockDisableClientLogs
        }
    }));
};

beforeEach(() => {
    jest.mock('pako', () => ({
        inflate: jest.fn(() => '--++[{"message":"Hello World!"}]')
    }));

    pako = require('pako');

    request = {
        headers: {
            authorization: 'Bearer X7ATmtGdTQ',
            'content-encoding': 'text/plain'
        },
        rawBody: '--++[{"message":"Hello World!"}]'
    };

    gzipRequest = {
        headers: {
            authorization: 'Bearer X7ATmtGdTQ',
            'content-encoding': 'gzip'
        },
        rawBody: '--++[{"message":"Hello World!"}]'
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('pako');
});

describe('Given we want to upload client logs to the server', () => {
    test('then it should respond with status code 403 if the user is unauthenticated', async () => {
        mockOhanaShared(false, null);
        resolver = require('./ClientLogsFunction');
        const response = await resolver(null, {
            headers: {
                'content-encoding': 'text/plain'
            },
            rawBody: '--++[{"message":"Hello World!"}]'
        });

        expect(response.httpResponse.status).toEqual(403);
        expect(response.httpResponse.body).toEqual('Forbidden');
    });

    test('then it should respond with status code 400 if the gzip content is invalid', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        pako.inflate.mockImplementationOnce(() => {
            throw new Error();
        });

        const response = await resolver(null, gzipRequest);
        expect(response.httpResponse.status).toEqual(400);
        expect(response.httpResponse.body).toEqual('Bad input');
    });

    test('then it should respond with status code 400 if the rawBody content is too short', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        pako.inflate.mockImplementationOnce(() => '--++[H');

        const response = await resolver(null, gzipRequest);
        expect(response.httpResponse.status).toEqual(400);
        expect(response.httpResponse.body).toEqual('Bad input');
    });

    test('then it should respond with status code 400 if the rawBody does not have the correct prefix', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        pako.inflate.mockImplementationOnce(() => '[{"message":"Hello World!"}]');

        const response = await resolver(null, gzipRequest);
        expect(response.httpResponse.status).toEqual(400);
        expect(response.httpResponse.body).toEqual('Bad input');
    });

    test('then it should respond with status code 400 if the rawBody does not have the correct array format', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        pako.inflate.mockImplementationOnce(() => '--++[{"message":"Hello World!"}');

        const response = await resolver(null, gzipRequest);
        expect(response.httpResponse.status).toEqual(400);
        expect(response.httpResponse.body).toEqual('Bad input');
    });

    test('then it should respond with status code 200 if the rawBody has the correct format and content type is gzip', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        const response = await resolver(null, gzipRequest);
        expect(response.httpResponse.status).toEqual(200);
    });

    test('then it should respond with status code 200 if the rawBody has the correct format and content type is text/plain', async () => {
        mockOhanaShared(false, true);
        resolver = require('./ClientLogsFunction');
        const response = await resolver(null, request);
        expect(response.httpResponse.status).toEqual(200);
    });

    describe('when we disable the functionality via feature flag', () => {
        test('then it should return status code 200', async () => {
            mockOhanaShared(true, true);
            resolver = require('./ClientLogsFunction');
            const response = await resolver(null, request);

            expect(response.httpResponse.status).toEqual(200);
        });
    });
});
