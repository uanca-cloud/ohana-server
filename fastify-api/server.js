if (!process.env.BAXTER_ENV || process.env.BAXTER_ENV === 'local') {
    require('dotenv').config({path: './fastify-api/.env'});
}

const fastify = require('fastify'),
    fastifyExpress = require('@fastify/express'),
    fastifyApollo = require('@as-integrations/fastify').default,
    {createGraphqlServer} = require('./graphql/GraphqlFunction'),
    {healthCheck} = require('./health/HealthCheckFunction'),
    {heartBeat} = require('./heartbeat/HeartBeatFunction'),
    {schemaFunction} = require('./schema/SchemaFunction'),
    {configurationFunction} = require('./config/ConfigurationFunction'),
    {notificationHubLogsFunction} = require('./notification-hub-logs/NotificationHubLogsFunction'),
    //    {twilioLogs} = require('./twilio-logs/TwilioLogsFunction'),
    {notificationsFunction} = require('./notifications/NotificationsFunction'),
    {updateMediaAttachmentFunction} = require('./attachMedia/UpdateMediaAttachmentFunction'),
    {attachmentFunction} = require('./attachment/AttachmentFunction'),
    {
        CONSTANTS: {
            PORT,
            VERSION_HEADER_NAME,
            BUILD_HEADER_NAME,
            DEFAULT_BUILD_NUMBER,
            WEB_PUBSUB_EVENT_HANDLER_PATH,
            WEB_PUBSUB_HUB_NAME,
            WEB_PUBSUB_URL,
            DISABLE_CSA_INTEGRATION
        },
        getFastifyLogger,
        getLogger,
        releaseAllConnections,
        flush,
        teardownFederatedTenantsLoader,
        teardownUnprocessedQueuedMessages,
        clearQueue
    } = require('ohana-shared'),
    {createHandler, destroyHandler} = require('./graphql/subscriptions/AzureWebPubSubHandler'),
    multer = require('fastify-multer'),
    upload = multer(),
    cors = require('@fastify/cors'),
    {schemaWithMiddleware} = require('./graphql/SchemaWithMiddleware');

const logger = getLogger('server');

function setupGlobalErrorHandling(app) {
    process.on('unhandledRejection', (reason) => {
        logger.error({error: reason}, 'Unhandled rejection!');
    });

    app.setErrorHandler(function (error, _request, reply) {
        logger.error({error}, 'Application error!');
        reply.send(error);
    });
}

function registerHttpEndpoints(app) {
    app.get('/health', async (request, reply) => {
        await healthCheck(request, reply);
    });

    app.head('/heartbeat', async (request, reply) => {
        await heartBeat(request, reply);
    });

    app.get('/schema', async (request, reply) => {
        await schemaFunction(request, reply);
    });

    app.get('/config', async (request, reply) => {
        await configurationFunction(request, reply);
    });

    app.get('/notification-hub-logs', async (request, reply) => {
        await notificationHubLogsFunction(request, reply);
    });

    // TODO commenting out this code as auth rules will need to be added when exposing /logs endpoint in the future.
    // app.get('/logs', async (request, reply) => {
    //     await twilioLogs(request, reply);
    // });

    app.post('/notifications', async (request, reply) => {
        await notificationsFunction(request, reply);
    });

    app.route({
        method: 'POST',
        url: '/attachMedia',
        preHandler: upload.single('attachment'),
        handler: async (request, reply) => {
            await updateMediaAttachmentFunction(request, reply);
        }
    });

    app.head('/attachMedia', async (request, reply) => {
        await updateMediaAttachmentFunction(request, reply);
    });

    app.get('/attachment/:id', async (request, reply) => {
        await attachmentFunction(request, reply);
    });

    app.get('/attachment/:id/:thumbnail', async (request, reply) => {
        await attachmentFunction(request, reply);
    });

    app.get('/', async (_request, reply) => {
        reply.code(200).header('content-type', 'application/json; charset=utf-8').send();
    });
}

async function bootstrap() {
    const app = fastify({
        logger: getFastifyLogger(),
        disableRequestLogging: true
    });

    setupGlobalErrorHandling(app);

    const server = await createGraphqlServer(app);

    logger.debug('Starting server...');
    await server.start();
    await app.register(fastifyApollo(server), {
        context: (request) => {
            const sessionId = request.headers.authorization
                ? request.headers.authorization.replace('Bearer ', '')
                : null;

            return {
                sessionId,
                version: request.headers[VERSION_HEADER_NAME],
                buildNumber: request.headers[BUILD_HEADER_NAME] ?? DEFAULT_BUILD_NUMBER
            };
        }
    });
    await app.register(multer.contentParser);
    await app.register(cors, (_instance) => {
        return (req, callback) => {
            const corsOptions = {
                origin: ['*'],
                methods: ['POST', 'GET', 'HEAD']
            };

            // do not include CORS headers for requests from event handler
            if (req.url === WEB_PUBSUB_EVENT_HANDLER_PATH) {
                corsOptions.origin = false;
            }

            // callback expects two parameters: error and options
            callback(null, corsOptions);
        };
    });

    if (!DISABLE_CSA_INTEGRATION) {
        const handler = await createHandler(
            schemaWithMiddleware,
            WEB_PUBSUB_HUB_NAME,
            WEB_PUBSUB_EVENT_HANDLER_PATH,
            [WEB_PUBSUB_URL]
        );

        await app.register(fastifyExpress);
        app.use(handler.getMiddleware());
    }

    app.addHook('onRequest', (request, _reply, done) => {
        const type = request.headers['content-type'];
        if (
            !type ||
            request.url === WEB_PUBSUB_EVENT_HANDLER_PATH ||
            (type.indexOf('json') < 0 && type.indexOf('multipart/form-data') < 0)
        ) {
            request.headers['content-type'] = 'application/json';
        }

        done();
    });

    registerHttpEndpoints(app);

    try {
        const address = await app.listen({port: PORT, host: '0.0.0.0'});
        logger.debug(`Server listening on ${address}`);
    } catch (error) {
        logger.error('Error starting server:', error);
        process.exit(1);
    }

    // in case the container shuts down, we get a SIGTERM -> timer -> SIGKILL
    // where timer is 30s in azure and 10s for docker-compose
    process.on('SIGTERM', async () => {
        // breakpoint here if you need to debug shutdown
        await tearDown();
    });
}

async function tearDown() {
    flush();

    if (!DISABLE_CSA_INTEGRATION) {
        await destroyHandler();
        clearQueue();
        await releaseAllConnections();
        teardownUnprocessedQueuedMessages();
        teardownFederatedTenantsLoader();
    }
}

module.exports = {
    bootstrap
};
