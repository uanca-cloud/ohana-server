const AZFError = require('./azf-error');

class TenantError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Tenant Error',
            code: 'INVALID_TENANT',
            error,
            description
        });
    }
}

module.exports = TenantError;
