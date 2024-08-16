const AZFError = require('./azf-error');

class NotUniqueError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Not Unique Error',
            code: 'NOT_UNIQUE',
            error,
            description
        });
    }
}

module.exports = NotUniqueError;
