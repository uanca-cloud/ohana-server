const {mapSchema, getDirective, MapperKind} = require('@graphql-tools/utils'),
    {defaultFieldResolver} = require('graphql'),
    {ForbiddenError} = require('ohana-shared');

function grantsDirective(directiveName) {
    return {
        grantsDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.OBJECT_FIELD](fieldConfig) {
                    const grantDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                    if (grantDirective) {
                        const {resolve = defaultFieldResolver} = fieldConfig;
                        fieldConfig.roles = grantDirective['roles'];
                        return {
                            ...fieldConfig,
                            resolve: async function (source, args, context, info) {
                                const {tenantId, userId, role} = context;

                                const allowedRoles = fieldConfig.roles;
                                if (!allowedRoles) {
                                    return resolve(source, args, context, info);
                                }

                                if (!allowedRoles.includes(role)) {
                                    throw new ForbiddenError({message: 'Invalid Role'});
                                }

                                if (!tenantId || !userId) {
                                    throw new ForbiddenError({message: 'Not authorized'});
                                }

                                return resolve(source, args, context, info);
                            }
                        };
                    }
                }
            })
    };
}

module.exports = grantsDirective;
