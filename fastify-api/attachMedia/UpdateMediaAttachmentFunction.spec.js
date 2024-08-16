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
        getRedisCollectionData: jest.fn(() =>
            Promise.resolve({
                userId: '1234'
            })
        ),
        getMediaAttachment: jest.fn(() =>
            Promise.resolve({
                id: '123'
            })
        ),
        getSession: jest.fn(() => Promise.resolve(true)),
        getTenantSetting: jest.fn(() =>
            Promise.resolve({
                value: 'true'
            })
        ),
        generateThumbnailBuffer: jest.fn(() => {
            return Buffer.from('testfile', 'utf8');
        }),
        bootstrapStorageAccount: jest.fn(() => {
            return {
                uploadBlockBlob: jest.fn().mockReturnValue(Promise.reject())
            };
        }),
        createAttachment: jest.fn(() =>
            Promise.resolve({
                id: '12345'
            })
        ),
        getPatientByEncounterId: jest.fn(() => {
            return {
                id: 1
            };
        })
    }));
    jest.mock('uuid', () => ({
        v4: jest.fn(() => '12345')
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./UpdateMediaAttachmentFunction').updateMediaAttachmentFunction;

    request = {
        method: 'GET',
        headers: {
            [VERSION_HEADER_NAME]: LAST_SUPPORTED_VERSION,
            ['authorization']: 'Bearer 1234567890'
        },
        body: {
            body: {}
        },
        file: {}
    };

    response = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
    };
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('uuid');
});

describe('Given we want to send a request to the update media attachment endpoint', () => {
    test('then it should return status code 400 if the client version is not supported', async () => {
        request.headers[VERSION_HEADER_NAME] = '1.0.0';
        await resolver(request, response);

        expect(response.code).toHaveBeenCalledWith(400);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR'
        });
    });

    describe('when using the HEAD http method', () => {
        test('then it should return status code 200 if the endpoint is up', async () => {
            request.method = 'HEAD';
            await resolver(request, response);

            expect(response.code).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalled();
        });
    });

    describe('when using the GET http method', () => {
        test('then it should return status code 403 if the user is no authenticated', async () => {
            ohanaSharedPackage.getSession.mockImplementationOnce(() => Promise.resolve(false));
            await resolver(
                {
                    method: 'GET',
                    headers: {
                        [VERSION_HEADER_NAME]: LAST_SUPPORTED_VERSION
                    },
                    body: {
                        body: {}
                    },
                    file: {}
                },
                response
            );

            expect(response.code).toHaveBeenCalledWith(403);
            expect(response.send).toHaveBeenCalledWith('User is not authenticated');
        });

        describe('and a tenant setting for media attachment exists and is false', () => {
            test('then it should return status code 409 if media attachment is not allowed', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() =>
                    Promise.resolve({
                        value: false
                    })
                );
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(409);
                expect(response.send).toHaveBeenCalledWith({
                    message: 'Media attachments not allowed',
                    code: 'MEDIA_DISABLED_ERROR'
                });
            });
        });

        describe('and a tenant setting for media attachment does not exist', () => {
            test('then it should use the default flag value and return status code 400', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() =>
                    Promise.resolve(null)
                );
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
            });
        });

        describe('and encounterId is missing from request body', () => {
            test('then it should return status code 400', async () => {
                request.body.body = {
                    updateId: '123'
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith(
                    'Update id and encounter id are missing'
                );
            });
        });

        describe('and updateId is missing from request body', () => {
            test('then it should return status code 400', async () => {
                request.body.body = {
                    encouterId: '123'
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith(
                    'Update id and encounter id are missing'
                );
            });
        });

        describe('and file attachment is missing from request body', () => {
            test('then it should return status code 400', async () => {
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                request.file = undefined;
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith('Attachment is missing');
            });
        });

        describe('and the update id is invalid', () => {
            test('then it should return status code 400', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => null);
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith('Invalid update id');
            });
        });

        describe('and the encounter id on the update is different from the encounter id sent', () => {
            test('then it should return status code 400', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                    return {encounterId: '1234', updateId: '123'};
                });
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith('Invalid encounter id or user id');
            });
        });

        describe('and the user id on the update is different from the user id sent', () => {
            test('then it should return status code 400', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                    return {encounterId: '123', updateId: '1234', userId: '123'};
                });
                ohanaSharedPackage.getSession.mockImplementationOnce(() => {
                    return {userId: '1234'};
                });
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith('Invalid encounter id or user id');
            });
        });

        describe('and the patient associated with the encounter cannot be retrieved', () => {
            test('then it should return status code 400', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                    return {encounterId: '123', updateId: '1234', userId: '123'};
                });
                ohanaSharedPackage.getSession.mockImplementationOnce(() => {
                    return {userId: '123'};
                });
                ohanaSharedPackage.getMediaAttachment.mockImplementationOnce(() => null);
                ohanaSharedPackage.bootstrapStorageAccount.mockImplementationOnce(() => {
                    return {
                        uploadBlockBlob: jest.fn().mockReturnValue(Promise.resolve())
                    };
                });
                ohanaSharedPackage.getPatientByEncounterId.mockImplementationOnce(() => null);
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                request.file = {buffer: 'asd', originalname: 'file', mimetype: 'image'};
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(400);
                expect(response.send).toHaveBeenCalledWith('Patient is missing from the encounter');
            });
        });

        describe('and the media attachment is found', () => {
            test('then it should return status code 200', async () => {
                ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                    return {encounterId: '123', updateId: '1234', userId: '123'};
                });
                ohanaSharedPackage.getSession.mockImplementationOnce(() => {
                    return {userId: '123'};
                });
                ohanaSharedPackage.getMediaAttachment.mockImplementationOnce(() => {
                    return {id: '1'};
                });
                request.body = {
                    body: JSON.stringify({encounterId: '123', updateId: '123'})
                };
                request.file = {
                    buffer: 'dfdfdfdfd',
                    originalname: 'testfile',
                    mimetype: 'jpeg'
                };
                await resolver(request, response);

                expect(response.code).toHaveBeenCalledWith(200);
                expect(response.send).toHaveBeenCalledWith(JSON.stringify({id: '1'}));
            });
        });

        describe('and the media attachment is not found and the upload fails', () => {
            describe('and the upload fails', () => {
                test('then it should return status code 500', async () => {
                    ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                        return {encounterId: '123', updateId: '1234', userId: '123'};
                    });
                    ohanaSharedPackage.getSession.mockImplementationOnce(() => {
                        return {userId: '123'};
                    });
                    ohanaSharedPackage.getMediaAttachment.mockImplementationOnce(() => null);

                    request.body = {
                        body: JSON.stringify({encounterId: '123', updateId: '123'})
                    };
                    request.file = {
                        buffer: 'dfdfdfdfd',
                        originalname: 'testfile',
                        mimetype: 'jpeg'
                    };
                    await resolver(request, response);

                    expect(response.code).toHaveBeenCalledWith(500);
                    expect(response.send).toHaveBeenCalledWith(
                        'Unexpected Error while uploading to storage.'
                    );
                });
            });

            describe('and the upload is successful', () => {
                test('then it should return status code 200', async () => {
                    ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => {
                        return {encounterId: '123', updateId: '1234', userId: '123'};
                    });
                    ohanaSharedPackage.getSession.mockImplementationOnce(() => {
                        return {userId: '123'};
                    });
                    ohanaSharedPackage.getMediaAttachment.mockImplementationOnce(() => null);
                    ohanaSharedPackage.bootstrapStorageAccount.mockImplementationOnce(() => {
                        return {
                            uploadBlockBlob: jest.fn().mockReturnValue(Promise.resolve())
                        };
                    });

                    request.body = {
                        body: JSON.stringify({encounterId: '123', updateId: '123'})
                    };
                    request.file = {
                        buffer: 'dfdfdfdfd',
                        originalname: 'testfile',
                        mimetype: 'jpeg'
                    };
                    await resolver(request, response);

                    expect(response.code).toHaveBeenCalledWith(200);
                    expect(response.send).toHaveBeenCalledWith(JSON.stringify({id: '12345'}));
                });
            });
        });
    });
});
