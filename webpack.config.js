const path = require('path');
const nodeExternals = require('webpack-node-externals');
const manifest = require('./package.json');

module.exports = {
    entry: {
        ConfigurationFunction: './azure-functions/ConfigurationFunction.js',
        GraphqlFunction: './fastify-api/GraphqlFunction.js',
        SchemaFunction: './azure-functions/SchemaFunction.js',
        LogsFunction: './azure-functions/LogsFunction.js'
    },
    mode: 'production',
    output: {
        path: path.join(__dirname, 'output/dist/azure-functions'),
        publicPath: '/',
        filename: '[name].js'
    },
    target: 'node',
    node: {
        __dirname: false,
        __filename: false
    },
    externals: [
        nodeExternals({
            allowlist: Object.keys(manifest.dependencies)
        })
    ]
};
