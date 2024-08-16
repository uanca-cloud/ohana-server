const AZFError = require('./azf-error');

class UnauthorizedError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Unauthorized Error',
            code: 'UNAUTHORIZED',
            error,
            description
        });
    }
}

module.exports = UnauthorizedError;
