const {csaQueries} = require('../csa/graphql/GraphQLFileHelper'),
    {makeCsaHttpRequest} = require('../csa/CsaHttpGateway'),
    {getLogger} = require('../logs/LoggingService'),
    {
        csaEnabledForTenant,
        loadTenantCredentials,
        refreshTenantIndex,
        addNewTenantToIndex
    } = require('./TenantCsaCredentialDao'),
    {createFederatedTenantResources} = require('./TenantCsaRmqConfigurationDao');

const logger = getLogger('TenantCsaDao');

async function csaTenantRegistration(tenantId, userId) {
    try {
        if (!(await csaEnabledForTenant(tenantId))) {
            logger.debug({metadata: {tenantId}}, 'Fetching federated tenants...');
            const tenants = await refreshTenantIndex();

            if (tenants?.indexOf(tenantId) === -1) {
                const {
                    rmq: {credential, secret}
                } = await loadTenantCredentials(tenantId);

                const csaResponse = await registerTenant(tenantId, userId, credential, secret);

                if (csaResponse) {
                    await createFederatedTenantResources(tenantId, credential, secret);
                    await addNewTenantToIndex(tenantId);
                    //this return is used by the written integration tests
                    return csaResponse;
                } else {
                    logger.error({metadata: {tenantId}}, 'CSA tenant registration failed');
                }
            }
        }
    } catch (error) {
        logger.error({error, metadata: {tenantId}}, 'CSA tenant registration failed');
    }
}

async function registerTenant(tenantId, userId, credential, secret) {
    const encodedCredentials = Buffer.from(`${credential}:${secret}`).toString('base64');

    const variables = {
        input: {
            credentials: encodedCredentials
        }
    };

    const response = await makeCsaHttpRequest(
        tenantId,
        userId,
        'registerTenant',
        csaQueries.registerTenant,
        variables
    );
    if (!response.ok) {
        logger.error({metadata: {tenantId}}, 'Registering a tenant on CSA failed');
        throw new Error('Registering a tenant on CSA failed');
    }

    const responseJson = await response.json();
    if (!responseJson?.data?.registerTenant) {
        logger.error({metadata: {tenantId}}, 'Registering a tenant on CSA failed');
        throw new Error('Registering a tenant on CSA failed');
    }
    logger.debug({metadata: {tenantId}}, 'Successfully registered tenant on CSA');
    //this return is used by the written integration tests
    return responseJson;
}

module.exports = {
    csaTenantRegistration,
    registerTenant
};
