const {getLogger} = require('../logs/LoggingService'),
    {TENANT_IDS_HASH} = require('../constants'),
    {getRedisHashMap} = require('../RedisGateway');

const logger = getLogger('TenantHelper');

async function getTenantShortCode(tenantId) {
    logger.info({metadata: {tenantId}}, 'Fetching tenant short code from tenantId...');

    const tenantShortCodeJSON = await getRedisHashMap(TENANT_IDS_HASH, tenantId);
    if (tenantShortCodeJSON) {
        const tenantShortCode = JSON.parse(tenantShortCodeJSON);
        return tenantShortCode.toUpperCase();
    } else {
        logger.warn({metadata: {tenantId}}, 'Missing short code for tenant');
    }
}

module.exports = {getTenantShortCode};
