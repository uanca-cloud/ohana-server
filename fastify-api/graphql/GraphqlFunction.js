const {ApolloServer} = require('@apollo/server'),
    {fastifyApolloDrainPlugin} = require('@as-integrations/fastify'),
    {ApolloServerPluginCacheControl} = require('@apollo/server/plugin/cacheControl'),
    {formatResponse, formatError, isProdEnv} = require('ohana-shared'),
    resolvers = require('./resolvers'),
    {ApolloServerPluginDrainHttpServer} = require('@apollo/server/plugin/drainHttpServer'),
    {schemaWithMiddleware} = require('./SchemaWithMiddleware');

async function createGraphqlServer(app) {
    const httpServer = app.server;

    return new ApolloServer({
        schema: schemaWithMiddleware,
        resolvers,
        plugins: [
            fastifyApolloDrainPlugin(app),
            // eslint-disable-next-line new-cap
            ApolloServerPluginCacheControl({calculateHttpHeaders: 'if-cacheable'}),
            {
                async requestDidStart() {
                    return {
                        async willSendResponse(requestContext) {
                            const {response, operationName, contextValue} = requestContext;
                            // Augment response with an extension, as long as the operation
                            // actually executed. (The `kind` check allows you to handle
                            // incremental delivery responses specially.)
                            if (
                                response.body.kind === 'single' &&
                                'data' in response.body.singleResult &&
                                operationName !== 'IntrospectionQuery'
                            ) {
                                return formatResponse(
                                    contextValue,
                                    response.body.singleResult,
                                    operationName
                                );
                            }
                        }
                    };
                }
            },
            // Proper shutdown for the HTTP server.
            // eslint-disable-next-line new-cap
            ApolloServerPluginDrainHttpServer({httpServer})
        ],
        introspection: !isProdEnv(),
        includeStacktraceInErrorResponses: !isProdEnv(), // Remove stacktrace on external envs
        formatError: (formattedError) => formatError(formattedError),
        status400ForVariableCoercionErrors: true
    });
}

module.exports = {
    createGraphqlServer
};
