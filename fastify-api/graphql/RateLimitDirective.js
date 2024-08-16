const {mapSchema, getDirective, MapperKind} = require('@graphql-tools/utils'),
    {defaultFieldResolver} = require('graphql'),
    {
        CONSTANTS: {DISABLE_RATE_LIMITING}
    } = require('ohana-shared'),
    rateLimit = require('./RateLimit');

function rateLimitDirective(directiveName) {
    return {
        rateLimitDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.OBJECT_FIELD](fieldConfig) {
                    const rateLimitDirective = getDirective(
                        schema,
                        fieldConfig,
                        directiveName
                    )?.[0];
                    if (rateLimitDirective) {
                        const {resolve = defaultFieldResolver} = fieldConfig;
                        fieldConfig.reqLimit = rateLimitDirective['reqLimit'];
                        fieldConfig.expireInSec = rateLimitDirective['expireInSec'];
                        fieldConfig.strategy = rateLimitDirective['strategy'];
                        return {
                            ...fieldConfig,
                            resolve: async function (source, args, context, info) {
                                const userId = context.userId,
                                    fieldName = info.fieldName;

                                !DISABLE_RATE_LIMITING &&
                                    (await rateLimit[fieldConfig.strategy](
                                        {
                                            userId,
                                            reqLimit: fieldConfig.reqLimit,
                                            expireInSec: fieldConfig.expireInSec
                                        },
                                        fieldName
                                    ));

                                return resolve(source, args, context, info);
                            }
                        };
                    }
                }
            })
    };
}

module.exports = rateLimitDirective;
