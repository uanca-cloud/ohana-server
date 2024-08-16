const { mapSchema, getDirective, MapperKind } = require('@graphql-tools/utils'),
    { defaultFieldResolver } = require('graphql');

function deprecatedDirective(directiveName) {
    return {
        deprecatedDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.OBJECT_FIELD](fieldConfig) {
                    const deprecatedDirective = getDirective(schema, fieldConfig, directiveName)?.[0]
                    if (deprecatedDirective) {
                        const {resolve = defaultFieldResolver} = fieldConfig;
                        fieldConfig.deprecationReason = deprecatedDirective['reason'];
                        return {
                            ...fieldConfig,
                            resolve: async function(source, args, context, info) {
                                const fields = context.fields ?? [];
                                fields.push({
                                    name: info.fieldName,
                                    isDeprecated: true,
                                    reason: fieldConfig.deprecationReason
                                });
                                context.fields = fields;
                                return resolve(source, args, context, info);
                            }
                        }
                    }
                },
                [MapperKind.ENUM_VALUE](enumValueConfig) {
                    const deprecatedDirective = getDirective(schema, enumValueConfig, directiveName)?.[0]
                    if (deprecatedDirective) {
                        enumValueConfig.deprecationReason = deprecatedDirective['reason']
                        return enumValueConfig
                    }
                }
            })
    }
}

module.exports = deprecatedDirective;
