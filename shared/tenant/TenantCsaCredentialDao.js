const {isLocal, isHotfixEnv} = require('../EnvironmentHelper');
const {deleteRedisKey, setRedisHashMap, getRedisHashMap} = require('../RedisGateway');
const {
    REDIS_COLLECTIONS,
    CSA_APP_CONFIG_KEY_PREFIX,
    LOAD_TEST_DUMMY_CREDENTIAL
} = require('../constants');
const {getKeysByTenant} = require('../AzureAppConfigGateway');
const {listAllFederatedTenants} = require('./TenantCsaRmqConfigurationDao');
const {getLogger} = require('../logs/LoggingService');

const logger = getLogger('TenantCsaCredentialDao');

/**
 *
 * @param tenantId
 * @returns {Promise<{rmq: {credential: string, secret: string}, http: {credential: string, secret: string}}>}
 */
async function loadTenantCredentials(tenantId) {
    let entries;
    const glob = `${CSA_APP_CONFIG_KEY_PREFIX}_${tenantId}_`;

    if (isLocal()) {
        const {getKeysByGlob: getKeysByGlobLocally} = require('../LocalAppConfigGateway');
        entries = await getKeysByGlobLocally(glob);
    } else if (isHotfixEnv()) {
        entries = {
            http: {
                credential: LOAD_TEST_DUMMY_CREDENTIAL,
                secret: LOAD_TEST_DUMMY_CREDENTIAL
            },
            rmq: {
                credential: LOAD_TEST_DUMMY_CREDENTIAL,
                secret: LOAD_TEST_DUMMY_CREDENTIAL
            }
        };
    } else {
        entries = await getKeysByTenant(tenantId);
    }

    if (
        !entries.http.credential ||
        !entries.http.secret ||
        !entries.rmq.credential ||
        !entries.rmq.secret
    ) {
        logger.warn({metadata: tenantId}, 'Tenant does not have CSA enabled');
        throw new Error('Tenant does not have CSA enabled');
    }

    return entries;
}

async function refreshTenantIndex() {
    const tenantIds = await listAllFederatedTenants();
    await deleteRedisKey(REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS);
    const addPromises = tenantIds?.map((tenantId) => {
        return addNewTenantToIndex(tenantId);
    });
    addPromises && (await Promise.all(addPromises));
    return tenantIds;
}

async function addNewTenantToIndex(tenantId) {
    return setRedisHashMap(REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS, tenantId, {
        hasCredentials: true,
        hasConfig: true
    });
}

async function csaEnabledForTenant(tenantId) {
    const tenantPropsJSON = await getRedisHashMap(
        REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS,
        tenantId
    );
    const tenantProps = tenantPropsJSON && JSON.parse(tenantPropsJSON);
    return tenantProps?.hasConfig && tenantProps?.hasCredentials;
}

module.exports = {
    loadTenantCredentials,
    refreshTenantIndex,
    addNewTenantToIndex,
    csaEnabledForTenant
};
