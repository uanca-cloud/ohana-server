const {GraphQLError} = require('graphql');

class UserInputError extends GraphQLError {
    constructor({message, error, description}) {
        const extensions = {
            error,
            description,
            code: 'BAD_USER_INPUT'
        };
        super(message, {extensions});
    }
}

module.exports = UserInputError;
