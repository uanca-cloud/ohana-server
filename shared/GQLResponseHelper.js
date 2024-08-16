const {GraphQLError} = require('graphql'),
    {isProdEnv} = require('./EnvironmentHelper'),
    {hideSuggestions} = require('./ValidationService');

function deprecationResponse(context, response) {
    const fields = context.fields || [];

    if (fields.length) {
        if (response) {
            const deprecatedFields = fields.filter((field) => field.isDeprecated);

            if (deprecatedFields.length > 0) {
                response.extensions = {...response.extensions, deprecatedFields};
            }
        }
    }

    return response || {};
}

function warningResponse(context, response, operationName) {
    const fields = context.fields || [];

    if (fields.length) {
        if (response) {
            const warningFields = fields.filter(
                (field) => field.isVersionMismatch && field.name !== operationName
            );

            if (warningFields.length > 0) {
                response.extensions = {...response.extensions, warnings: warningFields};
                delete response.errors;
            }
        }
    }

    return response || {};
}

function formatError(formattedError) {
    const extensions = {
        ...formattedError.extensions
    };
    delete extensions.stacktrace;
    if (formattedError.extensions?.stacktrace) {
        extensions.exception = {
            stacktrace: formattedError.extensions.stacktrace
        };
    }
    const legacyError = {
        ...formattedError,
        extensions
    };
    if (legacyError.extensions.code === 'INTERNAL_SERVER_ERROR') {
        return new GraphQLError('Unexpected error', {
            extensions: {
                ...legacyError.extensions,
                code: 'UNEXPECTED_ERROR'
            }
        });
    }
    // Otherwise return the original error.
    return isProdEnv()
        ? hideSuggestions(legacyError) //Remove suggestions/hints on external envs
        : {
              message: legacyError.message,
              extensions: legacyError.extensions
          };
}

function formatResponse(context, response, operationName) {
    response = deprecationResponse(context, response);

    if (response.errors && response.errors[0].extensions.code === 'VERSION_MISMATCH') {
        response = warningResponse(context, response, operationName);
    }

    return response;
}

module.exports = {
    formatResponse,
    formatError
};
