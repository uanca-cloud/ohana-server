const {
        CONSTANTS: {
            HEALTH_CHECK_SUCCESS_CODE,
            HEALTH_CHECK_FAILURE_CODE,
            DB_CONNECTION_POOLS,
            REDIS_CONNECTION_POOLS,
            PG_REPORTING_CONNECTION_STRING,
            REDIS_CONNECTION_STRING,
            RABBITMQ_CONNECTION_POOLS,
            DISABLE_CSA_INTEGRATION,
            RABBITMQ_CONNECTION_STRING_INFRA
        },
        getLogger,
        getMigrationVersion,
        getKeyspaceInfo,
        getManifestVersion,
        getAllPoolStats,
        createRedisPool,
        createDatabasePool,
        createRabbitMQPool
    } = require('ohana-shared'),
    assertServiceBusConnection = require('./AzureServiceBusAssertionCommand'),
    assertBranchIoConnection = require('./BranchIoAssertionCommand'),
    assertAzureStorageConnection = require('./AzureStorageAssertionCommand'),
    assertRabbitmqAmqpConnection = require('./RabbitmqAmqpAssertionCommand');

let dbPool = null,
    redisPool = null,
    rabbitmqAmqpPool = null;

const logger = getLogger('HealthCheckFunction');

async function healthCheck(req, reply) {
    logger.debug('ENTER:HealthCheck');

    const {method} = req;
    let status;

    const response = {
        timestamp: Date.now()
    };

    if (!dbPool) {
        dbPool = await createDatabasePool(
            DB_CONNECTION_POOLS.HEALTH,
            PG_REPORTING_CONNECTION_STRING
        );
    }

    if (!redisPool) {
        redisPool = await createRedisPool(REDIS_CONNECTION_POOLS.HEALTH, REDIS_CONNECTION_STRING);
    }

    if (!DISABLE_CSA_INTEGRATION) {
        if (!rabbitmqAmqpPool) {
            rabbitmqAmqpPool = await createRabbitMQPool(
                RABBITMQ_CONNECTION_POOLS.HEALTH,
                RABBITMQ_CONNECTION_STRING_INFRA
            );
        }
    }

    try {
        const output = await Promise.allSettled([
            getMigrationVersion(),
            getKeyspaceInfo(),
            getManifestVersion(),
            assertServiceBusConnection(),
            assertBranchIoConnection(),
            assertAzureStorageConnection()
        ]);

        const report = {
            db: output[0],
            cache: output[1],
            version: output[2],
            serviceBus: output[3],
            branchIO: output[4],
            azureStorage: output[5]
        };

        if (!DISABLE_CSA_INTEGRATION) {
            const outputForEnabledCSA = await Promise.allSettled([assertRabbitmqAmqpConnection()]);
            output.push(outputForEnabledCSA[0]);
            report.rmqAMQP = outputForEnabledCSA[0];
        }

        report.pool = getAllPoolStats();

        const allPassed = output.every((module) => module.status === 'fulfilled');

        response.pass = allPassed;
        response.report = report;

        status = allPassed ? HEALTH_CHECK_SUCCESS_CODE : HEALTH_CHECK_FAILURE_CODE;
    } catch (error) {
        response.pass = false;
        response.error = error.message;
        logger.error({error}, error.message);

        status = HEALTH_CHECK_FAILURE_CODE;
    }

    if (method === 'HEAD') {
        logger.debug('EXIT:HealthCheck');
        return reply.code(status).send();
    }

    reply
        .code(status)
        .header('content-type', 'application/json; charset=utf-8')
        .send(JSON.stringify(response));

    logger.debug('EXIT:HealthCheck');
}

module.exports = {healthCheck};
