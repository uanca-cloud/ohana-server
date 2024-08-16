let ohanaSharedPackage = null,
    request = {},
    response = {},
    resolver;
const {
    CONSTANTS: {VERSION_HEADER_NAME, LAST_SUPPORTED_VERSION}
} = require('ohana-shared');

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getSession: jest.fn(() => Promise.resolve(true)),
        getCommittedAttachmentById: jest.fn(() =>
            Promise.resolve({
                originalFilename: 'testFile',
                encounterId: '1',
                originalUrl: 'testUrl',
                thumbUrl: 'testThumbUrl',
                updateId: '1'
            })
        ),
        getBlobTempPublicUrl: jest.fn(() => Promise.resolve('testToken'))
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./AttachmentFunction').attachmentFunction;

    request = {
        method: 'GET',
        headers: {
            [VERSION_HEADER_NAME]: LAST_SUPPORTED_VERSION
        },
        params: {
            id: '1',
            thumbnail: 'testFile'
        }
    };
    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        headers: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to get attachments as media files', () => {
    test('then it should respond with status code 400 if the version is not supported', async () => {
        request.headers[VERSION_HEADER_NAME] = '1.0.0';

        await resolver(request, response);
        expect(response.code).toHaveBeenCalledWith(400);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR'
        });
    });

    describe('when the HEAD http verb is used', () => {
        test('then it should respond with status code 200 if the version is supported', async () => {
            request.method = 'HEAD';

            await resolver(request, response);
            expect(response.code).toHaveBeenCalledWith(200);
        });
    });

    describe('when the GET http verb is used', () => {
        test('then it should respond with status code 403 if the user is unauthenticated', async () => {
            ohanaSharedPackage.getSession.mockImplementationOnce(() => Promise.resolve());
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith('User is not authenticated');
        });

        test('then it should respond with status code 403 if the user is admin', async () => {
            ohanaSharedPackage.getSession.mockImplementationOnce(() =>
                Promise.resolve({role: 'Administrator'})
            );
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith(
                'User is not allowed to perform this action'
            );
        });

        test('then it should respond with status code 403 if the attachment is not found', async () => {
            ohanaSharedPackage.getSession.mockImplementationOnce(() =>
                Promise.resolve({role: 'ApprovedUser'})
            );
            ohanaSharedPackage.getCommittedAttachmentById.mockImplementationOnce(() =>
                Promise.resolve()
            );
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith('Attachment not found');
        });

        test('then it should respond with status code 301 if the attachment and user are found', async () => {
            ohanaSharedPackage.getSession.mockImplementationOnce(() =>
                Promise.resolve({role: 'ApprovedUser'})
            );
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(301);
            expect(response.redirect).toHaveBeenCalledWith(301, 'testThumbUrl?testToken');
        });
    });
});
