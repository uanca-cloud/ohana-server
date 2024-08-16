const AZFError = require('./azf-error');

class PermissionError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Permission Error',
            code: 'PERMISSION_ERROR',
            error,
            description
        });
    }
}

module.exports = PermissionError;
