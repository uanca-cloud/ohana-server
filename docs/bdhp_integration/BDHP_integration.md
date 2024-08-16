# Server track

## BDHP Integration

This feature’s purpose is to integrate BDHP into the Ohana applications as a new authentication system. This document will focus on the implementation for the BDHP integration in the Ohana server.

### Overview

The BDHP integration on the server side will allow the mobile and admin applications to perform requests to the server in order to obtain the fully constructed authentication URL that will be further used to authenticated the user inside the system. Once a JWT is created it will be sent to the server for validation and the normal flow of the application can be continued. The Ohana server is responsible for returning the authentication URL and validating the JWT token obtained through this authentication, both operations being done with the Supergraph integration.

New configuration parameters need to be added to the infrastructure code in order to establish the connection between the Ohana Server and the CSA Supergraph.

A new Graphql query will be added so that the mobile and admin clients can request the authentication url specific to the platform used by a specific Tenant.

The existing `adminCreateOrRefreshSession` and `caregiverCreateOrRefreshSession` mutations will be updated on the server side so that they validate the JWT obtained from the clients using the platform specific URLs.

The existing `findPatientInformation` query will be updated so that it requests the Patient information from a specific platform instead of automatically DHP.

**_TODO:_**
Add jama link to reference design.

### Configurations

New configuration parameters need to be added at the infrastructure level so that the connection to the Supergraph can be established. These values are:

- `CSA_CLIENT_ID` - A unique ID per requesting client which will be in the HTTP requests to the Supergraph in the `X-Client-ID` header.
- `CSA_CLIENT_USER` and `CSA_CLIENT_PASSWORD` - Values generated from ECP used to identify the client application and sent in the `Authorization` header for the Supergraph requests as a base64 encoded `user:password` combination.
- `PRODUCT_NAME` - A unique name that identifies the product which sends the request to the Supergraph. It will be used as a part of the `X-User-Identity` header, which has the following format: `hrc:<product>:<user_id>`.
- `CSA_URL` - The base URL that will be used for all HTTP requests that need to be sent to the Supergraph.
- `DISABLE_CSA_VERIFICATION` - A flag similar to the existing `DISABLE_ZENITH_VERIFICATION` one, that will determine if the integration with BDHP is available or not.

These values need to be added to the `sample.env` configuration file for the local server configuration with their respective default values if they can be added to Github (are not keys) or empty strings that will be filled by each developer on their environment. For the parameters with values specific to a certain environment the values for the DEVELOPMENT environment will be chosen as the defaults for local environments.

The `constants.js` needs to be updated with the new parameter values, taking the values from the Node.js process or using a default if those values are empty:

```jsx
CSA_CLIENT_ID,
CSA_CLIENT_USER,
CSA_CLIENT_PASSWORD,
PRODUCT_NAME,
CSA_URL,
DISABLE_CSA_VERIFICATION,
```

### Implementation

**Obtaining the login credentials:**

**_TODO:_**
On the return from the openIdConnectUrl request with the oidcUrl value, an example is still needed from CSA.

- The following Graphql query and type will be added to the schema:

```graphql
type ConnectivityEndpoints {
    platform: String
    oidcUrl: String
}

# This query will retrieve the authentication urls for the platform used by Tenant
openIdConnectUrl(shortCode: ID!): ConnectivityEndpoints
```

- The versioning directive needs to be added to this query on the schema with the version in which this feature is shipped so that it will be available only from that version on.
- The `VersionValidationMiddleware.js` file needs to be updated, so that the new query is added to the list of queries for which the last supported version needs to be checked.

- A new resolver for this query, `OpenIdConnectUrlResolver`, will be added in the `./fastify-api/graphql/authentication` folder. It will contain the logic that needs to be applied once this query is called by the clients.
    - A new service file, `AuthenticationService`, will be added in the `./shared` folder to be used as a helper for the authentication process. The service will contain all functions that send requests related to the CSA integration.


- If the credentials cannot be retrieved from the CSA for any particular reason (connection cannot be established, tenant is invalid etc) an error should be thrown. If credentials are obtained successfully then the response should be formatted using a ConnectivityEndpoints template function, declared in the `EntitiesFactory.js` file.


- The connection between the resolver and the query needs to be declared in the `resolvers.js` file, using the following format:

- A schema validation file, `OpenIdConnectUrlSchemaValidation`, will be added in order to validate the input sent by the clients through the GraphQL query.

- The link between the schema validation and the query is done by declaring them in the `SchemaValidationMiddleware.js` file.

**Creating a session:**

- In order to create a valid session for the Ohana server, the mobile and admin clients will have to use the same mutations that were used in the previous versions: `adminCreateOrRefreshSession` and `caregiverCreateOrRefreshSession`, no additional changes need to be made on the schema for those two.

- Depending on the client version used in the request header made to the Ohana server to authentication the admin user, the JWT validation and Ohana `Session` creation will be done wither through the legacy DHP system or using the CSA integration:

The existing logic for the legacy DHP functionality doesn’t need to change since it will be used by the old client applications and it will be still used to address the backwards compatibility problem. A new implementation for the validation through the CSA integration needs to be added as a part of the `AuthenticationService`. The function would have to obtain the `pkiUrl` value from CSA and use that url to validate the JWT token.
If the token is successfully validated, a new session will be created in the Ohana application, otherwise an appropriate error will be thrown.

- For the `Caregiver` user, the JWT validation process will be determined by the client version as well.

The implementation for the legacy DHP doesn’t need to change since it will be used by the old mobile client applications and it will be still used to address the backwards compatibility problem. 
For the CSA integration a similar workflow as the one for admin will be implemented. A helper function should be added to the `AuthenticationService` that will validate the JWT using the `pkiUrl` value obtained from CSA.

- The short code tenant value needs to be added into the context so that it can be readily available when needed to send requests to the CSA. This will be done through the `CreateUserContextMiddleware.js` file by adding the `shortCode` property to the list of keys retrieved from the user session in the `createUserContextFunction`.

**Replacing CDR integration:**

- The `findPatientInformation` Grapqhl query used retrieve a patient’s information on a barcode scan will remain the same, no additional changes are required.

- For backwards compatibility reasons the existing logic will have to remain in place. A check for the version sent in the request header will have to be added in order to determine the implementation needed to be used, the old one through the legacy DHP system or the new one through the platform specific to the Tenant, obtained from CSA.

Tenant Short Code value can be retrieved from the `context` as it was added there from the existing redis Session.

- The logic to retrieve the Patient information from CDR can remain the same as the response type and logic needs to be the same for both DHP and BDHP. The only new update for the implementation should be the base url value used to make the request. It needs to be replaced with the `baseUrl` value obtained from CSA.
