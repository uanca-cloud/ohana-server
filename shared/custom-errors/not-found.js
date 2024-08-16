const AZFError = require('./azf-error');

class NotFoundError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Not Found Error',
            code: 'NOT_FOUND',
            error,
            description
        });
    }
}

module.exports = NotFoundError;
