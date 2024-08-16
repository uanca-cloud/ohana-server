const AZFError = require('./azf-error');

class VersionMismatchError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Version Mismatch Error',
            code: 'VERSION_MISMATCH',
            error,
            description
        });
    }
}

module.exports = VersionMismatchError;
