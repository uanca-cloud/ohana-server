const AZFError = require('./azf-error');

class DBError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'DB Error',
            code: 'DB_ERROR',
            error,
            description
        });
    }
}

module.exports = DBError;
