const AZFError = require('./azf-error');

class TimeoutError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Timeout Error',
            code: 'TIMEOUT_ERROR',
            error,
            description
        });
    }
}

module.exports = TimeoutError;
