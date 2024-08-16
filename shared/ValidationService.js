const {UserInputError} = require('./custom-errors'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('ValidationService');

const validate = (schema) => async (resolve, parent, args, context, info) => {
    try {
        await schema.validateAsync(args, {abortEarly: false});
        return resolve(parent, args, context, info);
    } catch (error) {
        let errors = [];
        for (let i = 0; i < error.details.length; i++) {
            const key = error.details[i].path[error.details[i].path.length - 1];
            errors[i] = {[key]: error.details[i].message};
        }
        logger.error({error: errors}, 'Invalid argument value');
        throw new UserInputError({message: 'Invalid argument value', error: errors});
    }
};

const hideSuggestions = (err) => ({
    message: err.message
        .replace(/Did you mean ".*"?/g, 'Did you mean [Suggestion hidden]')
        .replace(
            /argument ".*" of type ".*!" is required/g,
            'argument [Suggestion hidden] of type [Suggestion hidden] is required'
        )
        .replace(
            /Field ".*" of required type ".*!" was not provided/g,
            'Field [Suggestion hidden] of required type [Suggestion hidden] was not provided'
        )
        .replace(
            /Field ".*" is not defined by type ".*"/g,
            'Field [Suggestion hidden] is not defined by type [Suggestion hidden]'
        )
        .replace(
            /required type ".*!" was not provided/g,
            'required type [Suggestion hidden] was not provided'
        )
        .replace(
            /type ".*" used in position expecting type ".*!"/g,
            `type [Suggestion hidden] used in position expecting type [Suggestion hidden]`
        )
        .replace(/on type ".*"/g, `on type [Suggestion hidden]`)
        .replace(
            /of type ".*" must have a selection of subfields/g,
            `of type [Suggestion hidden] must have a selection of subfields`
        )
        .replace(/cannot represent a .* value:/g, `cannot represent a [Suggestion hidden] value:`)
        .replace(/; .* cannot represent value:/g, `; [Suggestion hidden] cannot represent value:`),
    extensions: err.extensions?.error?.length
        ? {...err.extensions, error: '[Suggestion hidden]'}
        : err.extensions
});

module.exports = {validate, hideSuggestions};
