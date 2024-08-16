const {GraphQLError} = require('graphql');

class ForbiddenError extends GraphQLError {
    constructor({message, error, description}) {
        const extensions = {
            error,
            description,
            code: 'FORBIDDEN'
        };
        super(message, {extensions});
    }
}

module.exports = ForbiddenError;
