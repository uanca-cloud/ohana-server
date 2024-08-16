const {
    getLogger,
    CONSTANTS: {VERSION_HEADER_NAME},
    ltLastSupportedVersion,
    graphQLSchema,
    isProdEnv
} = require('ohana-shared');

const logger = getLogger('SchemaFunction');

async function schemaFunction(request, response) {
    logger.debug('ENTER:Schema');

    let version = request.headers[VERSION_HEADER_NAME] ?? '1.0.0';

    if (isProdEnv()) {
        logger.debug('EXIT:Schema');
        return response.code(404).send({
            message: 'Not Found',
            code: 'NOT_FOUND'
        });
    } else if (ltLastSupportedVersion(version)) {
        logger.debug('EXIT:Schema');
        return response.code(403).send({
            message: 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR'
        });
    } else {
        logger.debug('EXIT:Schema');
        return response.code(200).send(graphQLSchema.schema);
    }
}

module.exports = {schemaFunction};
