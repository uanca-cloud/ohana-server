const allocateResources = require('./TenantCsaRmqResourceAllocationStrategy'),
    {CSA_RABBITMQ_FQDN} = require('../constants'),
    {
        listFederatedUpstreams,
        listPolicies,
        listExchanges,
        listBindings
    } = require('../csa/RabbitMQHttpApiGateway');

async function listAllFederatedTenants() {
    const federatedTenants = [];

    const [federationUpstreams, policies, exchanges, bindings] = await Promise.all([
        listFederatedUpstreams(),
        listPolicies(),
        listExchanges(),
        listBindings()
    ]);
    federationUpstreams?.forEach((federation) => {
        const tenantId = federation.value?.exchange;
        const hasPolicy = policies?.find((policy) => policy.name.includes(tenantId));
        const hasExchange = exchanges?.find((exchange) => exchange.includes(tenantId));
        const hasBinding = bindings?.find(
            (binding) =>
                binding.destination_type === 'exchange' && binding.source.includes(tenantId)
        );

        if (tenantId && hasPolicy && hasExchange && hasBinding) {
            federatedTenants.push(tenantId);
        }
    });

    return federatedTenants;
}

async function createFederatedTenantResources(tenantId, credential, secret) {
    if (!credential || !secret) {
        throw new Error('Missing credentials for RabbitMQ federation');
    }
    const connectionString = `amqps://${credential}:${secret}@${CSA_RABBITMQ_FQDN}`;
    await allocateResources(tenantId, connectionString);
}

module.exports = {
    listAllFederatedTenants,
    createFederatedTenantResources
};
