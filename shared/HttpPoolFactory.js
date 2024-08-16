const {getLogger} = require('./logs/LoggingService.js'),
    {createPool: genericCreatePool, getPool: genericGetPool} = require('./PoolFactory.js'),
    {HTTP_MIN_POOL_SIZE, HTTP_MAX_POOL_SIZE} = require('./constants.js'),
    fetch = require('node-fetch');

const logger = getLogger('HttpPoolFactory');

function generatePoolName(name) {
    return `http-${name}`;
}

/**
 * Creates HTTP connection pool using the generic-pool impl.
 * @param {string} name - the name of the new connection pool
 * @param {object} config - configuration options to be loaded into the connection pool
 * @param {string} config.url - the base url to use for subsequent requests
 * @param {object} config.defaultHeaders - default headers to be used when doing an HTTP request
 * @param {number} [minPoolSize] - min size of the connection pool
 * @param {number} [maxPoolSize] - max size of the connection pool
 * @returns {*}
 */
function createHttpPool(name, config, minPoolSize, maxPoolSize) {
    const generatedName = generatePoolName(name);

    const factory = {
        create: function () {
            const {defaultHeaders, url} = config;
            if (!('Content-Type' in defaultHeaders)) {
                logger.error(
                    {url, defaultHeaders},
                    "HTTP pool does not contain the default header of 'Content-Type' and can not be created"
                );
                throw new Error(
                    "HTTP pool does not contain the default header of 'Content-Type' and can not be created"
                );
            }

            return async (method, path = '', headers = {}, bodyParams = null) => {
                const options = {
                    method,
                    body: bodyParams,
                    headers: {
                        ...defaultHeaders,
                        ...headers
                    }
                };

                try {
                    return fetch(`${url}${path.length > 0 ? '/' + path : ''}`, options);
                } catch (err) {
                    logger.error({url, options, err}, 'HTTP request error!');
                    throw new Error(err);
                }
            };
        },
        validate: function (fn) {
            return typeof fn === 'function';
        },
        destroy: function (fn) {
            // eslint-disable-next-line no-unused-vars
            fn = null;
        }
    };

    minPoolSize = typeof minPoolSize === 'number' ? minPoolSize : HTTP_MIN_POOL_SIZE;
    maxPoolSize = typeof maxPoolSize === 'number' ? maxPoolSize : HTTP_MAX_POOL_SIZE;

    return genericCreatePool(factory, generatedName, {
        minPoolSize,
        maxPoolSize
    });
}

/**
 * Returns the named connection pool
 * @param {string} name - The name of the pool to retrieve
 */
function getHttpPool(name) {
    return genericGetPool(generatePoolName(name));
}

module.exports = {
    getHttpPool,
    createHttpPool
};
