const {getLogger} = require('../logs/LoggingService.js'),
    {getHttpPool} = require('../HttpPoolFactory'),
    {HTTP_CONNECTION_POOLS} = require('../constants');

const logger = getLogger('RabbitMQHttpApiGateway');

async function listExchanges() {
    const response = await makeHttpAdminApiRequest({
        path: `exchanges?page=1&page_size=500&use_regex=false&pagination=true`,
        method: 'GET'
    });

    if (!response.ok) {
        const message = 'Error retrieving exchange list!';
        logger.error(message);
        throw new Error(message);
    }

    const body = await response.json();
    return body.items.map((exchange) => exchange.name);
}

async function hasExchange(name) {
    if (!name) {
        const message = 'Cannot find exchange without name';
        logger.error(message);
        throw new Error(message);
    }

    const exchanges = await listExchanges();
    return exchanges.includes(name);
}

async function listBindings() {
    const response = await makeHttpAdminApiRequest({
        path: `bindings`,
        method: 'GET'
    });

    if (!response.ok) {
        const message = 'Error retrieving bindings!';
        logger.error(message);
        throw new Error(message);
    }

    return response.json();
}

async function hasExchangeBinding(destinationExchangeName, sourceExchangeName, routingKey) {
    if (!(destinationExchangeName && sourceExchangeName && routingKey)) {
        const message = 'source name, destination name, and routing key required!';
        logger.error(message);
        throw new Error(message);
    }

    const bindings = await listBindings();
    return bindings.some(
        (binding) =>
            binding.destination === destinationExchangeName &&
            binding.source === sourceExchangeName &&
            binding.destination_type === 'exchange' &&
            binding.routing_key === routingKey
    );
}

async function listPolicies() {
    const response = await makeHttpAdminApiRequest({
        path: `policies`,
        method: 'GET'
    });

    if (!response.ok) {
        const message = 'Error retrieving policies!';
        logger.error(message);
        throw new Error(message);
    }

    return response.json();
}

async function hasPolicy(name, upstreamName) {
    if (!(name && upstreamName)) {
        const message = 'policy name required!';
        logger.error(message);
        throw new Error(message);
    }

    const body = await listPolicies();
    return body.some(
        (policy) =>
            policy.name === name && policy.definition['federation-upstream'] === upstreamName
    );
}

async function listFederatedUpstreams() {
    const response = await makeHttpAdminApiRequest({
        path: `parameters/federation-upstream`,
        method: 'GET'
    });

    if (!response.ok) {
        const message = 'Error retrieving federated upstreams!';
        logger.error(message);
        throw new Error(message);
    }

    return response.json();
}

async function hasFederationUpstream(name) {
    if (!name) {
        const message = 'upstream name required!';
        logger.error(message);
        throw new Error(message);
    }

    const body = await listFederatedUpstreams();
    return body.some((upstream) => upstream.name === name);
}

//fu-csa-${tenantId}
//tenantId
async function createFederationUpstream(name, upstreamExchangeName, csaRmqConnectionString) {
    if (!(name && upstreamExchangeName)) {
        const message = 'Name and upstream name required!';
        logger.error(message);
        throw new Error(message);
    }

    const response = await makeHttpAdminApiRequest({
        path: `parameters/federation-upstream/%2F/${name}`,
        method: 'PUT',
        body: {
            component: 'federation-upstream',
            vhost: '/',
            name,
            value: {
                uri: csaRmqConnectionString,
                'prefetch-count': 100,
                'reconnect-delay': 5,
                'ack-mode': 'on-confirm',
                'trust-user-id': false,
                exchange: upstreamExchangeName,
                'max-hops': 1,
                expires: 604800000
            }
        }
    });
    if (!response.ok) {
        const message = 'Federation upstream creation failed';
        logger.error(message);
        throw new Error(message);
    }
}

//p-csa-${tenantId}
//fu-csa-${tenantId}
//${tenantId}
async function createPolicy(policyName, pattern, upstreamName) {
    if (!(policyName && pattern && upstreamName)) {
        const message = 'Policy name, pattern, and upstream name required!';
        logger.error(message);
        throw new Error(message);
    }

    const response = await makeHttpAdminApiRequest({
        path: `policies/%2F/${policyName}`,
        method: 'PUT',
        body: {
            vhost: '/',
            name: `${policyName}`,
            pattern,
            'apply-to': 'exchanges',
            priority: 0,
            definition: {'federation-upstream': upstreamName}
        }
    });
    if (!response.ok) {
        logger.error('Policy creation failed');
        throw new Error('Policy creation failed');
    }
}

async function createExchange(name) {
    if (!name) {
        const message = 'Exchange name required!';
        logger.error(message);
        throw new Error(message);
    }

    const response = await makeHttpAdminApiRequest({
        path: `exchanges/%2F/${name}`,
        method: 'PUT',
        body: {
            vhost: '/',
            name,
            type: 'topic',
            durable: true,
            internal: 'false',
            auto_delete: 'false',
            arguments: {}
        }
    });

    if (!response.ok) {
        logger.error('Exchange creation failed');
        throw new Error('Exchange creation failed');
    }
}

async function createExchangeBinding(destinationExchangeName, sourceExchangeName, routingKey) {
    if (!sourceExchangeName || !destinationExchangeName) {
        const message = 'Exchange name required!';
        logger.error(message);
        throw new Error(message);
    }

    const response = await makeHttpAdminApiRequest({
        path: `bindings/%2F/e/${sourceExchangeName}/e/${destinationExchangeName}`,
        method: 'POST',
        body: {
            vhost: '/',
            source: sourceExchangeName,
            destination: destinationExchangeName,
            destination_type: 'e',
            routing_key: routingKey,
            arguments: {}
        }
    });

    if (!response.ok) {
        logger.error('Binding creation failed');
        throw new Error('Binding creation failed');
    }
}

/**
 * Sends a request to the RMQ HTTP API
 * @param options
 * @param {string} options.method - HTTP verb
 * @param {string} options.path - URL to be appended to the base api url
 * @param {object} options.body - object to be sent in body
 * @returns {Promise<*>}
 */
async function makeHttpAdminApiRequest(options = {}) {
    const startTime = Date.now();
    const pool = getHttpPool(HTTP_CONNECTION_POOLS.RMQ_API);
    let fetch = null;

    logger.debug('Making RMQ Management API request');

    try {
        fetch = await pool.acquire();

        const {method, body, path} = options;

        let jsonBody;
        if (body) {
            jsonBody = JSON.stringify(body);
        }
        const response = await fetch(method, path, {}, jsonBody);
        if (!response.ok) {
            throw new Error('HTTP request to RabbitMQ REST API failed');
        }
        logger.info(
            {metadata: {duration: Date.now() - startTime}},
            'RMQ Management API request success'
        );
        return response;
    } catch (error) {
        logger.error(
            {error, metadata: {duration: Date.now() - startTime}},
            'HTTP request to RabbitMQ REST API failed'
        );
        throw error;
    } finally {
        if (fetch) {
            await pool.release(fetch);
        }
    }
}

module.exports = {
    listExchanges,
    hasExchange,
    listBindings,
    hasExchangeBinding,
    listFederatedUpstreams,
    hasFederationUpstream,
    listPolicies,
    hasPolicy,
    createFederationUpstream,
    createPolicy,
    createExchange,
    createExchangeBinding,
    makeHttpAdminApiRequest
};
