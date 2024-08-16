const PermissionError = require('./permission-error');

class MediaDisabledError extends PermissionError {
    constructor({message, error, description}) {
        super({
            message: message,
            code: 'MEDIA_DISABLED_ERROR',
            error,
            description
        });
    }
}

module.exports = MediaDisabledError;
