const AZFError = require('./azf-error');

class TenantRoleError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Tenant Role Error',
            code: 'FORBIDDEN_TENANT',
            error,
            description
        });
    }
}

module.exports = TenantRoleError;
