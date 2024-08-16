const {mapSchema, getDirective, MapperKind} = require('@graphql-tools/utils'),
    {defaultFieldResolver} = require('graphql'),
    {
        ServiceError,
        CONSTANTS: {DISABLE_CSA_INTEGRATION}
    } = require('ohana-shared');

function csaIntegrationDirective(directiveName) {
    return {
        csaIntegrationDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.OBJECT_FIELD](fieldConfig) {
                    const csaDisabledDirective = getDirective(
                        schema,
                        fieldConfig,
                        directiveName
                    )?.[0];
                    if (csaDisabledDirective) {
                        const {resolve = defaultFieldResolver} = fieldConfig;
                        return {
                            ...fieldConfig,
                            resolve: async function (source, args, context, info) {
                                if (DISABLE_CSA_INTEGRATION) {
                                    throw new ServiceError({message: 'CSA integration disabled'});
                                }

                                return resolve(source, args, context, info);
                            }
                        };
                    }
                }
            })
    };
}

module.exports = csaIntegrationDirective;
