const AZFError = require('./azf-error');

class InvalidFamilyTypeError extends AZFError {
    constructor({message, error, description}) {
        super({
            message:
                message ||
                'A family member with this relationship to patient cannot be a secondary family member',
            code: 'INVALID_FAMILY_TYPE',
            error,
            description
        });
    }
}

module.exports = InvalidFamilyTypeError;
