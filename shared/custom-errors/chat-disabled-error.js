const AZFError = require('./azf-error');

class ChatDisabledError extends AZFError {
    constructor({message, error, description}) {
        super({
            message: message || 'Chat Disabled Error',
            code: 'CHAT_DISABLED_ERROR',
            error,
            description
        });
    }
}

module.exports = ChatDisabledError;
