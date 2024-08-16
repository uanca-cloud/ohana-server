const {GraphQLError} = require('graphql');

class AuthenticationError extends GraphQLError {
    constructor({message, error, description}) {
        const extensions = {
            error,
            description,
            code: 'UNAUTHENTICATED'
        };
        super(message, {extensions});
    }
}

module.exports = AuthenticationError;
