const AZFError = require('./azf-error');

class TooManyRequestsError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Too many requests',
            code: 'TOO_MANY_REQUESTS',
            error,
            description
        });
    }
}

module.exports = TooManyRequestsError;
