const {GraphQLError} = require('graphql');

function extractErrorInformation(description, error, code) {
    return {
        code,
        originalMessage: error ? error.message : '',
        name: error ? error.name : '',
        stack: error ? error.stack : '',
        description
    };
}

class AZFError extends GraphQLError {
    constructor({message, error, code, description}) {
        const extensions = extractErrorInformation(description, error, code);
        super(message, {extensions});
    }
}

module.exports = AZFError;
