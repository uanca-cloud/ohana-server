const {getLogger, generateBranchIoUrl} = require('ohana-shared');

const logger = getLogger('BranchIoAssertionCommand');

async function assertBranchIoConnection() {
    logger.debug('Checking Branch Io connection');

    try {
        const url = await generateBranchIoUrl('dummyForHealthCheck');
        if (url) {
            return true;
        } else {
            throw new Error('Failed to connect to Branch Io');
        }
    } catch (error) {
        logger.error({error}, 'Unknown error occurred while generating BranchIO URL');
        throw error;
    }
}

module.exports = assertBranchIoConnection;
