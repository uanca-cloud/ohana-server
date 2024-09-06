# Ohana Server

Tier is composed of a collection of serverless functions running on the Azure Functions platform.
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

1. Access the [CSA RMQ admin UI] - the user and password can be provided by
   someone from Devop or CSA
2. Go to the exchanges tab and select the tenant short code you want to test with
