# Server-Mobile communication setup for Two Way Communication

This document tracks the server changes required to integrate into Voalte Family a WebSocket type connection, using
GraphQL Subscriptions and Azure PubSub.

### Overview

We will prepare the groundwork for real-time communication between the Voalte Family Server and the Mobile Client
Application. The Mobile Client application will connect directly to the Azure PubSub instance, while the server is
exposing a route to listen for WebHook events and react to
them. [This Microsoft article](https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-develop-eventhandler) has a good
summary of what we do for this implementation.

### Configurations

`WEB_PUBSUB_CONNECTION_STRING` - configuration value needs to be added to the Terraform infrastructure code for the
AppService Configuration. It will contain the connection string value for the Azure PubSub resource used.

`PUBSUB_HUB_NAME` - configuration value needs to be added to the Terraform infrastructure code for the AppService
Configuration. It will contain the string value name for the Hub used by the Azure PubSub.
This Hub will contain all user connections.

`DISABLE_CSA_INTEGRATION` - configuration value will be removed from the AppService Configuration code for all external
environments, and the value will be hardcoded in the `constants` file.

### Implementation

-   `Schema` and `resolvers.js` files will be updated to add a new object type Subscription.

-   New folder `fastify-api/subscriptions`, containing the necessary files to handle Azure PubSub connections

-   Changes to the `fastify-api/server.js` file to create and register a handler for WebHooks between Azure PubSub and
    Ohana Server, on the `/handler` endpoint

-   New resolver for the `getWebSocketUrl` query that will generate a temporary accessible WebSocket URL for a logged in
    user, the Mobile Client will use it to connect directly to Azure PubSub

-   Updates to Terraform so we set up the Event Handler for each environment
