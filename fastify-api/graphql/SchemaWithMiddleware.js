const {makeExecutableSchema} = require('@graphql-tools/schema'),
    {applyMiddleware} = require('graphql-middleware'),
    deprecatedDirective = require('./DeprecatedDirective'),
    versioningSchemaDirective = require('./VersioningSchemaDirective'),
    grantsDirective = require('./GrantDirective'),
    rateLimitDirective = require('./RateLimitDirective'),
    csaIntegrationDirective = require('./CSAIntegrationDirective'),
    resolvers = require('./resolvers'),
    versionValidationMiddleware = require('./VersionValidationMiddleware'),
    validationMiddleware = require('./SchemaValidationMiddleware'),
    createUserContextMiddleware = require('./CreateUserContextMiddleware'),
    updateSessionInactivityMiddleware = require('./UpdateSessionActivityMiddleware'),
    {deprecatedDirectiveTransformer} = deprecatedDirective('deprecated'),
    {versioningSchemaDirectiveTransformer} = versioningSchemaDirective('version'),
    {grantsDirectiveTransformer} = grantsDirective('grant'),
    {rateLimitDirectiveTransformer} = rateLimitDirective('rate_limit'),
    {csaIntegrationDirectiveTransformer} = csaIntegrationDirective('csa_integration'),
    {
        graphQLSchema: {typeDefs}
    } = require('ohana-shared');

let schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
        grant: grantsDirective,
        deprecated: deprecatedDirective,
        version: versioningSchemaDirective,
        rate_limit: rateLimitDirective,
        csa_integration: csaIntegrationDirective
    }
});

schema = deprecatedDirectiveTransformer(schema);
schema = versioningSchemaDirectiveTransformer(schema);
schema = grantsDirectiveTransformer(schema);
schema = rateLimitDirectiveTransformer(schema);
schema = csaIntegrationDirectiveTransformer(schema);

const middleware = [
    versionValidationMiddleware,
    validationMiddleware,
    createUserContextMiddleware,
    updateSessionInactivityMiddleware
];
const schemaWithMiddleware = applyMiddleware(schema, ...middleware);

module.exports = {
    schemaWithMiddleware,
    schema,
    resolvers
};
