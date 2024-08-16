let envHelper = null,
    validationService = null,
    formatResponse = null,
    formatError = null;

beforeEach(() => {
    jest.mock('@apollo/server/errors', () => ({
        unwrapResolverError: jest.fn((err) => err)
    }));

    jest.mock('./EnvironmentHelper', () => ({
        isProdEnv: jest.fn(() => false)
    }));

    jest.mock('./ValidationService', () => ({
        hideSuggestions: jest.fn()
    }));

    envHelper = require('./EnvironmentHelper');
    validationService = require('./ValidationService');
    formatResponse = require('./GQLResponseHelper').formatResponse;
    formatError = require('./GQLResponseHelper').formatError;
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('Given we want to check a request for deprecated fields', () => {
    describe('when no fields are marked as deprecated or versioned', () => {
        it('then the deprecation fields and the warnings fields should be undefined', async () => {
            const context = {};
            const response = {extensions: {}};

            const formattedResponse = formatResponse(context, response, null);

            expect(formattedResponse.extensions.deprecatedFields).toBe(undefined);
            expect(formattedResponse.extensions.warnings).toBe(undefined);
        });
    });

    describe('when deprecation fields list is empty', () => {
        it('then the deprecation fields should be undefined', async () => {
            const context = {fields: []};
            const response = {extensions: {}};

            const formattedResponse = formatResponse(context, response, null);

            expect(formattedResponse.extensions.deprecatedFields).toStrictEqual(undefined);
        });
    });

    describe('when a field is marked as deprecated', () => {
        it('then the deprecation fields should contain that field', async () => {
            const context = {
                fields: [{name: 'createdAt', isDeprecated: true, reason: 'No longer supported'}]
            };
            const response = {extensions: {}};

            const formattedResponse = formatResponse(context, response, null);

            expect(formattedResponse.extensions.deprecatedFields).toStrictEqual([
                {name: 'createdAt', isDeprecated: true, reason: 'No longer supported'}
            ]);
        });
    });

    describe('when versioning fields list is empty', () => {
        it('then the warnings fields should be undefined', async () => {
            const context = {fields: []};
            const response = {extensions: {}};

            const formattedResponse = formatResponse(context, response, null);

            expect(formattedResponse.extensions.warnings).toStrictEqual(undefined);
        });
    });

    describe('when a field is marked as versioned', () => {
        it('then the warnings fields should contain that field', async () => {
            const context = {
                fields: [
                    {
                        name: 'createdAt',
                        isVersionMismatch: true,
                        currentVersion: '1.0.0',
                        availableFromVersion: '1.1.0'
                    }
                ]
            };
            const response = {extensions: {}, errors: [{extensions: {code: 'VERSION_MISMATCH'}}]};

            const formattedResponse = formatResponse(
                context,
                response,
                'adminCreateOrRefreshSession'
            );

            expect(formattedResponse.extensions.warnings).toStrictEqual([
                {
                    name: 'createdAt',
                    isVersionMismatch: true,
                    currentVersion: '1.0.0',
                    availableFromVersion: '1.1.0'
                }
            ]);
        });
    });

    describe('when a graphql operation is marked as versioned', () => {
        it('then the warnings fields should contain that field', async () => {
            const context = {
                fields: [
                    {
                        name: 'adminCreateOrRefreshSession',
                        isVersionMismatch: true,
                        currentVersion: '1.0.0',
                        availableFromVersion: '1.1.0'
                    }
                ]
            };
            const response = {extensions: {}, errors: [{extensions: {code: 'VERSION_MISMATCH'}}]};

            const formattedResponse = formatResponse(
                context,
                response,
                'adminCreateOrRefreshSession'
            );

            expect(formattedResponse.extensions).toStrictEqual({});
            expect(formattedResponse.errors).toStrictEqual([
                {extensions: {code: 'VERSION_MISMATCH'}}
            ]);
        });
    });

    describe('when a field is marked as versioned and another field as deprecated', () => {
        it('then the warnings fields and deprecation fields should contain that field', async () => {
            const context = {
                fields: [
                    {
                        name: 'createdAt',
                        isVersionMismatch: true,
                        currentVersion: '1.0.0',
                        availableFromVersion: '1.1.0'
                    },
                    {name: 'expiresAt', isDeprecated: true, reason: 'No longer supported'}
                ]
            };
            const response = {extensions: {}, errors: [{extensions: {code: 'VERSION_MISMATCH'}}]};

            const formattedResponse = formatResponse(
                context,
                response,
                'adminCreateOrRefreshSession'
            );

            expect(formattedResponse.extensions.warnings).toStrictEqual([
                {
                    name: 'createdAt',
                    isVersionMismatch: true,
                    currentVersion: '1.0.0',
                    availableFromVersion: '1.1.0'
                }
            ]);
            expect(formattedResponse.extensions.deprecatedFields).toStrictEqual([
                {name: 'expiresAt', isDeprecated: true, reason: 'No longer supported'}
            ]);
        });
    });
});

describe('Given we want to format error messages to match previous server version', () => {
    describe("When we don't have the correct error format", () => {
        test('then we just return the provided object and empty extensions', () => {
            const error = {
                message: 'Some error'
            };
            const extensions = {extensions: {}};
            const response = formatError(error);
            expect(response).toEqual({...error, ...extensions});
        });
    });

    describe('When we have a formatted GQL error', () => {
        test('then we convert it from apollo-server 4 to 3 format', () => {
            const formattedError = {
                message: 'Some error',
                extensions: {
                    code: 'BAD_USER_INPUT',
                    stacktrace: {
                        some: 'place'
                    }
                }
            };
            const response = formatError(formattedError);
            expect(response).toEqual({
                message: 'Some error',
                extensions: {
                    code: 'BAD_USER_INPUT',
                    exception: {
                        stacktrace: {
                            some: 'place'
                        }
                    }
                }
            });
        });

        test('then if prod env, hide suggestions should be called', () => {
            const error = {
                message: 'Some error',
                extensions: {
                    code: 'BAD_USER_INPUT',
                    stacktrace: {
                        some: 'place'
                    }
                }
            };
            envHelper.isProdEnv.mockReturnValueOnce(true);
            formatError(error);
            expect(validationService.hideSuggestions).toHaveBeenCalled();
        });

        test('then it should not return internal server errors', () => {
            const error = {
                message: 'Some error',
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    stacktrace: {
                        some: 'place'
                    }
                }
            };
            const response = formatError(error);
            expect(response.extensions.code).toEqual('UNEXPECTED_ERROR');
        });
    });
});
