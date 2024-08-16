const AZFError = require('./azf-error');

class UnsupportedVersionError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Unsupported Version Error',
            code: 'UNSUPPORTED_VERSION_ERROR',
            error,
            description
        });
    }
}

module.exports = UnsupportedVersionError;
