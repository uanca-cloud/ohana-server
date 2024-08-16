const AZFError = require('./azf-error');

class CSAError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'An error occurred with the CSA integration',
            code: 'CSA_ERROR',
            error,
            description
        });
    }
}

module.exports = CSAError;
