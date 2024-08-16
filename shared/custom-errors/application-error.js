/**
 * Application error type used for known error handling
 */
class ApplicationError extends Error {
    /**
     * @param code {ERROR_CODES}
     * @param message {string}
     */
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

module.exports = ApplicationError;
