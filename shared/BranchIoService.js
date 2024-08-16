const fetch = require('node-fetch'),
    {BRANCH_IO_KEY, BRANCH_IO_URL} = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('BranchIoService');

async function generateBranchIoUrl(registrationToken) {
    logger.debug('Generating Branch Io url...');
    const body = {
        // eslint-disable-next-line camelcase
        branch_key: BRANCH_IO_KEY,
        data: {
            registrationToken
        },
        type: 1
    };

    const response = await fetch(`${BRANCH_IO_URL}url`, {
        method: 'post',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'}
    });

    if (response.ok) {
        const returnBody = await response.json();
        logger.debug('Url generated successfully with BranchIO.');
        return returnBody.url;
    }

    logger.error({error: response.error}, 'Generating URL with BranchIO failed.');
    return null;
}

module.exports = {generateBranchIoUrl};
