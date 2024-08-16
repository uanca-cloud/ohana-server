const {ApolloServer} = require('@apollo/server'),
    {startStandaloneServer} = require('@apollo/server/standalone'),
    {makeExecutableSchema} = require('@graphql-tools/schema'),
    {addMocksToSchema} = require('@graphql-tools/mock'),
    typeDefs = require('./fixtures/csa/schema'),
    {HTTP_CONNECTION_POOLS, REDIS_COLLECTIONS} = require('../constants'),
    {getHttpPool, createHttpPool} = require('../HttpPoolFactory'),
    {createTestPool, teardownTestPool, teardownTestClient} = require('./RedisTestHelper'),
    {setRedisHashMap} = require('../RedisGateway'),
    additionalTestEnvVars = require('./testEnv');

createTestPool();

const originalEnv = process.env;

let apollo_server = null,
    pool = null,
    fetchForPool = null,
    tenantId = 'TEST';

async function csaBootstrapMockServer(csaMockedURL, mockedTypes, mockedQueries, mockedMutations) {
    mockSupportModules();
    await startRedis();
    await startCsaHttpPool(csaMockedURL.origin.toString());
    await startCsaMockServer(csaMockedURL.port, mockedTypes, mockedQueries, mockedMutations);
}

async function startRedis() {
    const payload = {
        hasCredentials: true,
        hasConfig: true
    };
    await setRedisHashMap(REDIS_COLLECTIONS.CSA_CONFIGURED_TENANTS, tenantId, payload);
}

async function startCsaHttpPool(url) {
    try {
        pool = getHttpPool(HTTP_CONNECTION_POOLS.CSA);
        fetchForPool = await pool.acquire();
    } catch (error) {
        pool = await createHttpPool(
            HTTP_CONNECTION_POOLS.CSA,
            {defaultHeaders: {'Content-Type': 'application/json'}, url},
            1,
            2
        );
        fetchForPool = await pool.acquire();
    }
}

function mockSupportModules() {
    process.env = {
        ...originalEnv,
        ...additionalTestEnvVars
    };
}

async function startCsaMockServer(port, mockedTypes, mockedQueries, mockedMutations) {
    const schema = makeExecutableSchema({typeDefs});
    const mocks = generateSchemaMocks(mockedTypes);
    const mockedSchema = insertMocksToSchema(schema, mocks, mockedQueries, mockedMutations);

    apollo_server = new ApolloServer({schema: mockedSchema});
    return startStandaloneServer(apollo_server, {
        listen: {port: Number(port)}
    });
}

function generateSchemaMocks(mockedTypes = {}) {
    const mockedDate = new Date();
    const mockedDateString = mockedDate.toISOString();

    const mockedScalarsAndUnion = {
        SharedIdentity: () => 'hrc:9.8.7.6:abc123',
        MetadataSchema: () => '{test: test}',
        Timestamp: () => mockedDateString,
        MediaType: () => 'MediaTypeTest',
        //union mocked
        TextMessageElement: () => ({
            __typename: 'ChatMessageTextElement',
            text: 'test text for TextMessageElement'
        })
    };
    return {...mockedScalarsAndUnion, ...mockedTypes};
}

function insertMocksToSchema(schema, mocks, queryResolvers = {}, mutationResolvers = {}) {
    return addMocksToSchema({
        schema,
        mocks,
        resolvers: (store) => ({
            Query: queryResolvers,
            Mutation: mutationResolvers(store)
        })
    });
}

function csaResetMockStore(store) {
    store.reset();
}

async function resetCsaSetUp() {
    teardownTestClient();
}

async function csaTearDown() {
    await csaTearDownMockServer();
    await pool.release(fetchForPool);
    await teardownTestPool();
}

async function csaTearDownMockServer() {
    if (apollo_server) {
        return new Promise((resolve) => {
            apollo_server.stop().then(() => resolve());
        });
    }
}

module.exports = {
    csaBootstrapMockServer,
    csaTearDown,
    csaTearDownMockServer,
    csaResetMockStore,
    resetCsaSetUp
};
