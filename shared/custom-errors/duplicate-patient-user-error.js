const AZFError = require('./azf-error');

class DuplicatePatientUserError extends AZFError {
    constructor({message, error, description}) {
        super({
            message:
                message ||
                'A family member mapped to this patient is already utilizing this relationship',
            code: 'DUPLICATE_PATIENT_USER',
            error,
            description
        });
    }
}

module.exports = DuplicatePatientUserError;
