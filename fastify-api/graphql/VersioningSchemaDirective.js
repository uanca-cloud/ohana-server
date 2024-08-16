const {mapSchema, getDirective, MapperKind} = require('@graphql-tools/utils'),
    semver = require('semver'),
    {VersionMismatchError} = require('ohana-shared'),
    {defaultFieldResolver} = require('graphql');

function versioningSchemaDirective(directiveName) {
    return {
        versioningSchemaDirectiveTransformer: (schema) =>
            mapSchema(schema, {
                [MapperKind.OBJECT_FIELD](fieldConfig) {
                    const versionDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                    if (versionDirective) {
                        const {resolve = defaultFieldResolver} = fieldConfig;
                        fieldConfig.userVersion = versionDirective['version'];
                        return {
                            ...fieldConfig,
                            resolve: async function (source, args, context, info) {
                                const userVersion = context.version;
                                const minVersion = fieldConfig.userVersion;
                                if (semver.lt(userVersion, minVersion)) {
                                    const fields = context.fields ?? [];

                                    fields.push({
                                        isVersionMismatch: true,
                                        name: info.fieldName,
                                        availableFromVersion: minVersion,
                                        currentVersion: userVersion
                                    });

                                    context.fields = fields;
                                    throw new VersionMismatchError({
                                        message: 'Operation not supported in this version'
                                    });
                                }
                                return resolve(source, args, context, info);
                            }
                        };
                    }
                }
            })
    };
}

module.exports = versioningSchemaDirective;
