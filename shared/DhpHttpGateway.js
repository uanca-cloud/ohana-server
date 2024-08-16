const {getHttpPool} = require('./HttpPoolFactory'),
    {HTTP_CONNECTION_POOLS} = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('DhpHttpGateway');

async function makeDhpApiCall(token, path, method) {
    const startTime = Date.now();
    const pool = getHttpPool(HTTP_CONNECTION_POOLS.DHP);
    let fetch = null;

    try {
        fetch = await pool.acquire();

        const headers = {
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(method, path, headers);
        logger.info({metadata: {duration: Date.now() - startTime}}, 'Retrieved data from DHP');
        return response;
    } catch (error) {
        logger.error(
            {error, metadata: {duration: Date.now() - startTime}},
            'HTTP request to DHP failed'
        );
        throw error;
    } finally {
        if (fetch) {
            await pool.release(fetch);
        }
    }
}

module.exports = {
    makeDhpApiCall
};
