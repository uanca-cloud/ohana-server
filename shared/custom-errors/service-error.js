const AZFError = require('./azf-error');

class ServiceError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Service Error',
            code: 'SERVICE_ERROR',
            error,
            description
        });
    }
}

module.exports = ServiceError;
