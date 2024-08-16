const {
        hasPolicy,
        createPolicy,
        hasFederationUpstream,
        createFederationUpstream,
        hasExchange,
        createExchange,
        hasExchangeBinding,
        createExchangeBinding
    } = require('../csa/RabbitMQHttpApiGateway'),
    {
        RABBITMQ_DEFAULT_EXCHANGE,
        CSA_CLIENT_ID,
        RABBITMQ_POLICY_PREFIX,
        RABBITMQ_EXCHANGE_PREFIX,
        RABBITMQ_FEDERATION_UPSTREAM_PREFIX
    } = require('../constants');

async function allocateResources(tenantId, connectionString) {
    const policyName = `${RABBITMQ_POLICY_PREFIX}${tenantId}`;
    const federationUpstreamName = `${RABBITMQ_FEDERATION_UPSTREAM_PREFIX}${tenantId}`;
    const exchangeName = `${RABBITMQ_EXCHANGE_PREFIX}${tenantId}`;
    const bindingPattern = `${tenantId}.gql.${CSA_CLIENT_ID}.#`;
    const upstreamPattern = `^${RABBITMQ_EXCHANGE_PREFIX}${tenantId}$`;

    if (!(await hasFederationUpstream(federationUpstreamName))) {
        await createFederationUpstream(federationUpstreamName, tenantId, connectionString);
    }
    if (!(await hasPolicy(policyName, federationUpstreamName))) {
        await createPolicy(policyName, upstreamPattern, federationUpstreamName);
    }
    if (!(await hasExchange(exchangeName))) {
        await createExchange(exchangeName);
    }
    if (!(await hasExchangeBinding(RABBITMQ_DEFAULT_EXCHANGE, exchangeName, bindingPattern))) {
        await createExchangeBinding(RABBITMQ_DEFAULT_EXCHANGE, exchangeName, bindingPattern);
    }
}

module.exports = allocateResources;
