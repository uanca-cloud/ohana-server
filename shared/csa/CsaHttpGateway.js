const {
        CSA_PRODUCT_OID,
        HTTP_CONNECTION_POOLS,
        DISABLE_CSA_MOCKING,
        CSA_MOCKING_URL
    } = require('../constants'),
    {getHttpPool} = require('../HttpPoolFactory'),
    {getLogger} = require('../logs/LoggingService'),
    {loadTenantCredentials} = require('../tenant/TenantCsaCredentialDao'),
    {isLocal} = require('../EnvironmentHelper'),
    fetch = require('node-fetch');

const logger = getLogger('CsaHttpGateway');

/**
 * Make a request to the CSA supergraph
 * @param {string} tenantId - tenant short code
 * @param {string} userId - user uuid
 * @param {string} operationName - debug name of operation
 * @param {string} query - graphql query to be executed
 * @param {object} variables - JSON containing variables to be used with the query field
 * @returns {Promise<*>}
 */
async function makeCsaHttpRequest(tenantId, userId, operationName, query, variables = {}) {
    const startTime = Date.now();
    const pool = getHttpPool(HTTP_CONNECTION_POOLS.CSA);
    let response = null;

    if (isLocal() && !DISABLE_CSA_MOCKING) {
        try {
            logger.debug('Making Mocked CSA GraphQL request ...');

            response = await fetch(CSA_MOCKING_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({query, variables})
            });
        } catch (error) {
            logger.error({error}, 'HTTP request to Mocked CSA failed');
            throw error;
        }
    } else {
        let fetch = null;
        logger.debug('Making CSA HTTP request ...');

        try {
            fetch = await pool.acquire();

            const body = JSON.stringify({
                operationName,
                query,
                variables
            });
            const {
                http: {credential, secret}
            } = await loadTenantCredentials(tenantId);
            const additionalHeaders = constructCsaHeaders(credential, secret, tenantId, userId);

            response = await fetch('POST', '', additionalHeaders, body);
            logger.info(
                {metadata: {duration: Date.now() - startTime}},
                'CSA HTTP Request finished'
            );
        } catch (error) {
            logger.error(
                {error, metadata: {duration: Date.now() - startTime}},
                'HTTP request to CSA failed'
            );
            throw error;
        } finally {
            await pool.release(fetch);
        }
    }

    return response;
}

/**
 * Construct the headers that cannot be set by default for CSA communication because they depend on user related data
 * @param {string} credential - generated in ECP
 * @param {string} secret - generated in ECP
 * @param {string} tenantId - tenant short code
 * @param {string} userId - user uuid
 * @returns {{'X-Tenant-ID', 'X-User-Identity': string}}
 */
function constructCsaHeaders(credential, secret, tenantId, userId) {
    const authorization = Buffer.from(`${credential}:${secret}`).toString('base64');
    return {
        Authorization: `Bearer ${authorization}`,
        'X-Tenant-ID': tenantId,
        'X-User-Identity': `hrc:${CSA_PRODUCT_OID}:${userId}`
    };
}

module.exports = {
    makeCsaHttpRequest,
    constructCsaHeaders
};
