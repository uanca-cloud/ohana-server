const AZFError = require('./azf-error');

class ValidationError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Validation Error',
            code: 'VALIDATION_ERROR',
            error,
            description
        });
    }
}

module.exports = ValidationError;
