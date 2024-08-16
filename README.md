# Ohana Server

[![FOSSA Status](https://app.fossa.com/api/projects/custom%2B19518%2Fgithub.com%2FHillrom-Enterprise%2Fohana-server.svg?type=shield)](https://app.fossa.com/projects/custom%2B19518%2Fgithub.com%2FHillrom-Enterprise%2Fohana-server?ref=badge_shield)

Ohana's server tier is composed of a collection of serverless functions running on the Azure Functions platform.
Responsibilities include:

-   Supporting the mobile and web client applications
-   Integrating with various 3rd party services

## Getting Started

The server development environment was built to make it easy for a developer working on any project in Ohana to spin up
a resource to develop against or use in a support capacity for a client application in Ohana.

### Prerequisites

The development workflow for this project relies on the following dependencies:

-   Docker Desktop - https://www.docker.com/get-started
-   Python 3 and pip - https://opensource.com/article/19/5/python-3-default-mac
-   docker-compose - https://docs.docker.com/compose/install/
-   NodeJS 18 and npm 9 via NVM
    -   https://hill-rom.atlassian.net/wiki/spaces/ENG/pages/1569997344/Web+Team+NodeJS+Installation

Reach out to a team member for the following files:

-   ./azure-functions/local.settings.json
-   ./fastify-api/.env
-   Most of this file can be scaffolded via `cp fastify-api/sample.env fastify-api/.env` but some values will still need
    to be provided by another team member.
-   ./fastify-api/.tenant.env - optional, used for the CSA integration

### Running the development server

The development server utilizes `docker-compose` and the Docker runtime to spin up a series of containers to emulate the
application, database, and messaging services necessary for the broker.

1. Run `npm run dev:up` to spin up the development containers. If you've not yet installed the Docker images associated
   with the project, this process may take a minute or two.
1. Once the application server container has been started, it will use the MS Azure Function Core runtime to detect
   changes to the source code and automatically restart the application server process. This feedback cycle usually
   takes ~5 seconds.
1. Once the containers have been started, the following endpoints should be open and available:
    1. The application server is available via HTTP @ `http://localhost:7071`.
    1. To observe logs from the running containers, use the command `npm run dev:logs` which will automatically tail all
       container logs.
    1. When you are finished with development, it is important to run `npm run dev:down` to destroy the containers. In
       cases where an error occurs with the configuration of a container or a bad restart of the container, orphaned
       containers can linger. Use the `docker system prune` command to clean these up occasionally, especially if you
       start to experience diskspace issues.
    1. A tty session can be established with the running application server by executing `npm run tty-web`.

> [!NOTE]  
> Try: http://localhost:7071/graphql, http://localhost:7071/health to verify if the server is up

### Resetting the development server

To start fresh and entirely clear out the local docker instance of images, volumes, and containers

1. Run `npm run dev:delete-all`

### Debugging the azure function container with WebStorms Remote Debugger (preferred)

1. By default, `npm run dev:up` will start the application server container with the inspector on port 5858.
2. To use WebStorm's debugger, create a new task of type `Attach to Node.js/Chrome`. Give it a name of `ohana-debugger`
   and use port 5858. Make sure to check reconnect automatically.
3. The task can only be run as a debug task and will be successful when you see a copy of the system out/err in the
   Debug window opened by WebStorm.
4. When the Azure Function Core runtime detects that the application server needs to be restarted, WebStorm should
   detect the disconnect and reconnect. In some cases it is possible that the Debugger won't be able to connect and
   crashes. In these cases, it's simplest to issue a `npm run dev:restart` to cycle the containers. Make sure to have
   stopped the debugger before bringing the Docker containers back up so none of the debugger's previous state is
   retained.

### Debugging the fastify container with WebStorms Remote Debugger (preferred)

1. By default, `npm run dev:up` will start the application server container with the inspector on port 9229.
2. To use WebStorm's debugger, create a new task of type `Attach to Node.js/Chrome`. Give it a name of `ohana-debugger`
   and use port 5858. Make sure to check reconnect automatically.
3. The task can only be run as a debug task and will be successful when you see a copy of the system out/err in the
   Debug window opened by WebStorm.

### Running unit tests

Unit tests are executed on the host and require NodeJS to be installed.

1. Run `npm install` on the root of the project to get started.
1. Execute `npm run test:unit` to kick off the test runner in watcher mode. Changes to the tests will trigger a re-run
   of the test suite.

### Debugging the CSA Integration

We use a federated exchange to route messages from the CSA RabbitMQ instance to our own. We have several dependencies in
our RabbitMQ cluster for this to work:

1. An exchange for each registered tenant, called `from-csa-[tenant-short-code]`
2. A binding between the tenant exchange and the main exchange, `csa-watchChat` with the routing key set
   to `[tenant-short-code].gql.[client-id].#`. The client will be different per environment, so we can route the
   messages accordingly.
3. A policy for the federation upstream, with the pattern: `^from-csa-[tenant-short-code]$`. This should be applied to
   the tenant exchange.
4. A federation upstream, where the connection string should point to the CSA RabbitMQ, and use a set of credentials
   defined per tenant in ECP. For this part to work, we need to register the tenant with the CSA. This is done
   automatically on user login in our server code.
5. We are able to check in our RabbitMQ admin interface if all the previously mentioned resources are created correctly.
   In the _Admin/Federation Status_ tab we should see an entry with a green light for each registered tenant.

If we have everything in place, we can test the connection between the RabbitMQ clusters by going in the CSA RabbitMQ
admin UI and sending a message that should be received by Ohana server.

1. Access the [CSA RMQ admin UI](https://[env]-us-amqp.vlt.hrdev.io:15671) - the user and password can be provided by
   someone from Devop or CSA
2. Go to the exchanges tab and select the tenant short code you want to test with
3. If you scroll a bit you'll see a `Publish message` section
    1. the routing key will have the same format as previously stated: `[tenant-short-code].gql.[client-id].#`
    2. you can skip the headers
    3. in properties, you should add: `type: gql.watchChannel`
    4. type a JSON payload
    5. payload encoding can be set to `String (default)`
    6. click publish
4. In Ohana server, you should see an info level log that the message was received. Please keep in mind that if you are
   not testing locally, there is a delay until you see the logs in Log Analytics due to batching

When writing integration tests that consume services from the CSA, we utilize the Apollo
library [add Mocks to GQL Schema](https://the-guild.dev/graphql/tools/docs/mocking#default-mock-example). This library
allows our team to thoroughly test the expected functionality from the CSA services that will be used; this includes
testing CSA Queries and Mutations inputs, mocking expected responses, and altering specific returned values on Types,
where the pre-populated mocked data does not meet our needs.

The foundational way to get CSA mocked is to call the `csaBootstrapMockServer` function that is in
the `./shared/test/CsaIntegrationHelper.js`

-   `csaBootstrapMockServer` function creates the mocked redis, the mocked CSA server with `ApolloServer`, and connects
    the CSA mocked Apollo server endpoint to the CSA HTTP connection pool.
-   After the tests run, we use the `csaTearDownMockServer` function to shut down the mock-redis, the CSA mocked Apollo
    server, and the CSA HTTP pool connection.
-   The mocked CSA will utilize the schema in the `./shared/test/fixtures/csa/schema.js`, as its type defs.
-   The `csaBootstrapMockServer` function has 4 parameters:
    1. `csaMockedUrl` - the `URL` that the apollo server will spin up on and the port that the HttpPool will be created
       with. This should be an instance of the URL object.
    2. `mockedTypes` - mocks specific type data that needs to be inserted where the pre-populated mocked data does not
       meet our needs.
    3. `mockedQueries` - used for mocking the functionality.
    4. `mockedMutations` - used for mocking the functionality.

We can specify what we want to mock by writing the expected responses and any logic for individual types, queries, and
mutations with the `mockedTypes`, `mockedQueries`, and `mockedMutations` arguments.

-   `mockedTypes`, `mockedQueries`, and `mockedMutations`, should return an empty object if they are not utilized or an
    object that contains keys that match the name of the Type, Query, or Mutation (defined in the schema). These objects
    are then passed to the resolver.
-   We can use the [Mock Store](https://the-guild.dev/graphql/tools/docs/mocking#mockstore) to access, generate or alter
    mocked values and this can be helpful in testing mutation inputs and then query that data.
    -   We can access the `store` as an argument of resolvers.
    -   If we want to reset any mock `store` data without doing a complete teardown of the mocked CSA Apollo server, we
        can call the `csaResetMockStore` within a resolver.
-   Sample code for integration tests where you need to mock the CSA:

    -   ```javascript
        const {
            csaBootstrapMockServer,
            csaTearDown,
            resetCsaSetUp
        } = require('../test/CsaIntegrationHelper');

        // TenantCsaRmqConfigurationDao needs to be mocked to produce rmq responses, for example returning federated tenants.
        jest.mock('../tenant/TenantCsaRmqConfigurationDao', () => {
            return {
                listAllFederatedTenants: jest.fn(() => []),
                createFederatedTenantResources: jest.fn(() => Promise.resolve())
            };
        });

        const csaMockedUrl = new URL('http://localhost:<any port value that is available>/');

        afterEach(async () => {
            await resetCsaSetUp();
        });

        afterAll(async () => {
            await csaTearDown();
        });

        describe('Given ...', () => {
            it('then ...', async () => {
                await csaBootstrapMockServer(
                    csaMockedUrl,
                    // mockedTypes
                    {
                        sampleType: () => '{mocked: 1}'
                    },
                    // mockedQueries
                    (store) => {
                        return {
                            sampleQuery: (_, {input}) => {
                                // Here we can utilize the input and store values to mock the expected return value.
                            },
                            sampleQueryTwo: (_, {input}) => {
                                // Here we can utilize the input and store values to mock the expected return value.
                            }
                        };
                    },
                    // mockedMutations
                    (store) => {
                        return {
                            sampleMutation: (_, {input}) => {
                                // Here we can utilize the input and store values to mock the expected return value.
                            }
                        };
                    }
                );
                // ... run test that calls the CSA queries or mutations
            });
        });
        ```

## Application design

### Orchestration of an incoming HTTP request

### Module organization

## Project structure

## Build targets

These commands are run via NPM scripts, e.g. `npm run clean`. To pass arguments, you must include `--` between the
script name and the args, e.g. `npm run dbm:create -- --name=my_migration`.

-   clean - Empties the working dir for the build: `./output`
-   analyze - Runs sloc and npm-audit on the code base
-   dev:rebuild - Run this when installing new NPM dependencies to bust the cached build image
-   dev:up - Brings up all containers run by `docker-compose` and sets up PG and Redis
-   dev:down - Brings down all containers run by `docker-compose`
-   dev:restart - Brings down all containers run by `docker-compose` and then brings them back up
-   dev:logs - Tails all logs for the Docker containers spun up with `docker-compose`
-   build - Bundles the artifact (only compresses the server for now)
-   ci - Temporary Jenkins target until Azure Devops is running. Runs a version bump based on CI server args, analyze,
    tests with metric reports, and bundles the azure function Docker image artifact.
    -   Because this command is a series of several other NPM scripts, commands args use a special syntax. The syntax
        is `npm run current_version next_version build_number`
    -   E.g. `npm run ci 1.5.0 1.6.0 78`
-   ci:build - runs the ci commands excluding analyze and tests
-   lint - runs eslint on the project
-   lint:json - saves the eslint report in json format
-   lint:report - runs both lint and lint:json against the codebase
-   test - runs both the unit and integration tests with the database migration scripts and merge test coverage report
-   test:unit - Spins up the test runner for the unit test suite in watch mode
-   test:int - Spins up the test runner for the integration test suite in watch mode
-   test:int:migrate - runs the integration tests with the database migration scripts and merge test coverage report
-   test:smoke - Spins up the test runner for the smoke test suite
-   pr - Runs a clean, analyze, and test with metric reports for BitBucket pre-merge builds.
-   default -- Runs the build target
-   dbm:create - Creates a database migration file using the name given as a parameter, the current app version and the
    timestamp
-   dbm:create:oneoff - Creates a one-off database migration file using the name given as a parameter, the current app
    version and the timestamp
-   dbm:up - Runs the up scripts for all database migrations
-   dbm:down - Runs the down scripts for all database migrations
-   dbm:up:bundle - Creates the migration bundle for the database version upgrade
-   dbm:down:bundle - Creates the migration bundle for the database version downgrade
-   db:oneoff:bundle - Creates the one-off migration bundle
-   test:cover:merge - Runs unit and integration tests and creates a merged JSON coverage file for local development
-   test:cover:report - Runs unit and integration tests and creates a merged HTML coverage file for local development

## Helpful commands and tips

Zscaler:

-   Background: Zscaler is a SaaS security platform used by Baxter employees.
-   Common Errors: requests for npm or azure container or the /health endpoint may be blocked with a '
    SELF_SIGNED_CERT_IN_CHAIN'.
-   Main Solution: Report any blocked domains that return the 'SELF_SIGNED_CERT_IN_CHAIN' error to BaxterIT to whitelist.
    This should solve any errors with Zscaler.
-   Work around MAC:
    -   Exit Zscaler or in Zscaler UI set ZIA to off and keep ZPA on.
    -   Confirm that KeyChain Access and confirm "Proxy Baxter Healthcare" Trust is set to "Use System Default".

SBOM:

-   Generating an SBOM report (Software Bill of Materials) is done during the `Dev_Ohana_Build.yml` git workflow
    with [cdxgen](https://www.npmjs.com/package/@cyclonedx/cdxgen). The generated SBOM report file, _sbom.json_, can be
    found on the CI Pipeline on the build details, see the Artifacts header and download the files directly there.
-   An SBOM report is a list of all the open source and third-party components present in a codebase. An SBOM also lists
    the licenses that govern those components, the versions of the components used in the codebase, and their patch
    status, which allows security teams to quickly identify any associated security or license risks.

### Updating configuration for an altered Zenith env

Ohana has a dependency on Zenith for authentication and authorization. Because of this, if Zenith migrates its
configuration to something different that currently employed, we have to validate the server configuration to match.
Below is a list of all items to verify:

-   Azure KeyVault values found in `<env>-AZURE-FUNCTION`
    -   `ZENITH-B2C-BASE-INSTANCE-URL` - Suffix of IEF ID
    -   `ZENITH-QUALIFIED-DOMAIN-NAME` - with `https`
    -   `SERVER-ENDPOINT-URL` - Used for PKI verification on Admin sessions
    -   `B2C-CLIENT-ID` - UUID for the IEF
    -   `OAUTH-LOGIN-URL` - Suffix of IEF name
    -   `OAUTH-SCOPED-BASE-URL` - Suffix of application ID
    -   `OAUTH-P-VALUE` - IEF ID
-   Admin Github Distribute Workflow
    -   `dhpHost` - FQDN with `https`

Make sure to regenerate the URLs used for DHP and Catalog services as well as HTTP-based authentication on
https://hill-rom.atlassian.net/wiki/spaces/SPARC/pages/2737243157/Ohana+-+Guide+to+working+with+Zenith on the wiki.

### Running SonarCloud report locally

Rather than pushing a code to a branch to trigger SonarCloud reports the report can be generated locally through the
SonarLint extension in Webstorm.

Steps to run

1. Use "cmd + ," to open the settings panel in webstorm
2. Select "Plugins"
3. Search for "SonarLint" and install
4. Restart webstorm and then select the SonarLint icon on the bottom left
5. Hit the configure button to open the SonarLint project settings
6. Select "Bind project to SonarQube / SonarCloud"
7. Hit "Configure the connection..." to setup the connection
8. Select the "+" button to create a new connection
9. Enter a name for the connection and make sure SonarCloud is selected and then hit the next button
10. Generate a token through https://sonarcloud.io/account/security
11. Enter the generated token and continue to finish setting up the connection
12. Select the connection you just made and set the project key to "Hillrom-Enterprise_ohana-server"
13. To run a report after selecting the SonarLint extension go to the "Report" tab
14. Hit the folder icon on the left within the tab and select to "Analyze all project files"

Note: If you make any updates to a node version or the project key you must click the Update local storage btn under
SonarLint Project Settings to view changes when re-running a report.
