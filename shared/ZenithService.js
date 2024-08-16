const jsonwebtoken = require('jsonwebtoken'),
    jwkToPem = require('jwk-to-pem'),
    fetch = require('node-fetch'),
    {
        ZENITH_B2C_BASE_INSTANCE_URL,
        ZENITH_CAREGIVER_SITE_CODE_CHECK,
        ZENITH_ROLES,
        OHANA_ROLES,
        DISABLE_ZENITH_VERIFICATION,
        ZENITH_PATIENT_CHECK,
        ZENITH_ENCOUNTER_CHECK,
        EXTERNAL_ID_TYPE_VISIT_NUMBER,
        ZENITH_LONG_TENANT_ID_CHECK,
        TENANT_IDS_HASH
    } = require('./constants'),
    {TenantError, TenantRoleError, ForbiddenError} = require('./custom-errors'),
    {getLogger} = require('./logs/LoggingService'),
    {makeDhpApiCall} = require('./DhpHttpGateway'),
    {setRedisHashMap} = require('./RedisGateway');

const logger = getLogger('ZenithService');

async function getPublicKeys() {
    const startTime = Date.now();
    const response = await fetch(ZENITH_B2C_BASE_INSTANCE_URL);

    if (response.ok) {
        return (await response.json()).keys.reduce((agg, current) => {
            const pem = jwkToPem(current);
            logger.info(
                {metadata: {duration: Date.now() - startTime}},
                'Get public keys completed'
            );
            return {
                ...agg,
                [current.kid]: {instance: current, pem}
            };
        }, {});
    }

    logger.error(
        {metadata: {duration: Date.now() - startTime}, error: response.error},
        'Failed to return zenith B2C url!'
    );
    return [];
}

async function fetchAdminIdentity(jwt) {
    const startTime = Date.now();
    const decoded = jsonwebtoken.decode(jwt);
    const decodedString = JSON.stringify(decoded).replace(/\\r\\n/g, ' ');
    const jwtPayload = JSON.parse(decodedString);
    const jwtMetadata = JSON.parse(jwtPayload.hillrom);

    //If Zenith verification is enabled, check the JWT signature
    if (!DISABLE_ZENITH_VERIFICATION) {
        const keys = await getPublicKeys();
        const tokenSections = jwt.split('.');
        const header = JSON.parse(Buffer.from(tokenSections[0], 'base64').toString('utf8'));
        const key = keys[header.kid];
        if (!key) {
            logger.error({metadata: {duration: Date.now() - startTime}}, 'Invalid JWT');
            throw new ForbiddenError({message: 'Invalid JWT'});
        }

        try {
            jsonwebtoken.verify(jwt, key.pem);
        } catch (error) {
            logger.error({metadata: {duration: Date.now() - startTime}}, 'Invalid JWT');
            throw new ForbiddenError({message: 'Invalid JWT'});
        }
    }

    const assignedRoles = findUserRoles(jwtMetadata.scopes.roles);
    if (!assignedRoles?.includes(OHANA_ROLES.ADMINISTRATOR)) {
        logger.error({metadata: {duration: Date.now() - startTime}}, 'Invalid role');
        throw new ForbiddenError({message: 'Forbidden'});
    }

    logger.info({metadata: {duration: Date.now() - startTime}}, 'Admin identity retrieved');

    return {
        userId: jwtPayload.sourceUser,
        firstName: jwtPayload.given_name,
        lastName: jwtPayload.family_name,
        title: jwtMetadata.jobTitle,
        role: OHANA_ROLES.ADMINISTRATOR,
        assignedRoles
    };
}

function decodeJwt(jwt) {
    const decoded = jsonwebtoken.decode(jwt);
    const decodedString = JSON.stringify(decoded).replace(/\\r\\n/g, ' ');
    const jwtPayload = JSON.parse(decodedString);
    const jwtMetadata = JSON.parse(jwtPayload.hillrom);
    return {jwtMetadata, jwtPayload};
}

/**
 * Fetches a Tenant Identifier from the Zenith catalogue API
 * @param token - oauth token created by admin web
 * @param shortCode - 4 digit code that corresponds to the tenant id
 */
async function fetchCaregiverTenantIdentifier(token, shortCode) {
    let tenantId = shortCode,
        validTenant;

    // in the case zenith verification is disabled, just use the short code as the tenant ID internally, otherwise check Zenith
    if (DISABLE_ZENITH_VERIFICATION) {
        validTenant = true;
        await setRedisHashMap(TENANT_IDS_HASH, tenantId, tenantId.toUpperCase());
    } else {
        if (!token) {
            logger.error('Forbidden');
            throw new ForbiddenError({message: 'Forbidden'});
        }
        if (!tenantId) {
            logger.error('Invalid tenant');
            throw new TenantError({message: 'tenantError', description: 'Tenant invalid'});
        }
        const tenantLongCodeResults = await fetchTenantLongCode(token, tenantId);
        tenantId = tenantLongCodeResults.tenantId;
        validTenant = tenantLongCodeResults.validTenant;
    }

    const {jwtMetadata, jwtPayload} = decodeJwt(token);
    const assignedRoles = findUserRoles(jwtMetadata.scopes.roles);

    if ((!validTenant && !assignedRoles) || assignedRoles.length === 0) {
        logger.error({metadata: {tenantId}}, 'Invalid tenant and user role');
        throw new TenantRoleError({
            message: 'tenantRoleError',
            description: 'Tenant and user role invalid'
        });
    } else if (!assignedRoles?.includes(OHANA_ROLES.CAREGIVER)) {
        logger.error('Invalid user role');
        throw new ForbiddenError({
            message: 'ForbiddenError',
            description: 'User role invalid'
        });
    } else if (!validTenant) {
        logger.error({metadata: {tenantId}}, 'Invalid tenant');
        throw new TenantError({
            message: 'tenantError',
            description: 'Tenant invalid'
        });
    }
    logger.info('Caregiver identity retrieved');

    return {
        userId: jwtPayload.sourceUser,
        firstName: jwtPayload.given_name,
        lastName: jwtPayload.family_name,
        title: jwtMetadata.jobTitle,
        email: jwtMetadata.mail,
        role: OHANA_ROLES.CAREGIVER,
        tenantId,
        assignedRoles
    };
}

async function getPatientUrl(token, tenantId, patientExternalId, patientExternalIdType) {
    let url = `${ZENITH_PATIENT_CHECK}/${tenantId}/Patient?identifier=${patientExternalId}`;

    if (patientExternalIdType === EXTERNAL_ID_TYPE_VISIT_NUMBER) {
        let encounterUrl = `${ZENITH_ENCOUNTER_CHECK}/${tenantId}/Encounter?identifier=${patientExternalId}`;

        const encouterResult = await makeDhpApiCall(token, encounterUrl, 'GET');

        if (encouterResult.status === 200) {
            const encounterResource = await encouterResult.json();
            const resource = encounterResource.entry[0]?.resource;
            const reference = resource?.subject?.reference;

            url = `${ZENITH_PATIENT_CHECK}/${tenantId}/${reference}`;
        } else {
            return null;
        }
    }

    return url;
}

async function fetchPatientInformationFromZenithAPI(
    token,
    tenantId,
    patientExternalId,
    patientExternalIdType
) {
    logger.debug('Getting patient information from Zenith...');
    let patient = null;

    if (!token) {
        logger.error(
            {metadata: {patientExternalId, tenantId}},
            'An invalid token was returned from Zenith for patient information.'
        );
        throw new Error(`Invalid Token`);
    }

    if (!tenantId || !patientExternalId) {
        logger.error({metadata: {patientExternalId, tenantId}}, 'Invalid tenant or patient.');
        throw new TenantError({message: 'tenantError', description: 'Invalid tenant or patient'});
    }

    let url = await getPatientUrl(token, tenantId, patientExternalId, patientExternalIdType);
    if (!url) {
        logger.error({metadata: {patientExternalId, tenantId}}, 'Patient url failed to return!');
        return null;
    }

    const res = await makeDhpApiCall(token, url, 'GET');

    if (res.status === 200) {
        if (patientExternalIdType === EXTERNAL_ID_TYPE_VISIT_NUMBER) {
            patient = await res.json();
        } else {
            const resource = await res.json();
            patient = resource.entry[0].resource;
        }

        return {
            firstName: patient.name[0]?.given[0],
            lastName: patient.name[0]?.family,
            dateOfBirth: patient.birthDate,
            cdrId: patient.id
        };
    }

    logger.error(
        {metadata: {patientExternalId, tenantId}, error: res.error},
        'Request to DHP API failed!'
    );
    return null;
}

async function fetchTenantShortCode(token, longTenantId) {
    try {
        const path = `${ZENITH_LONG_TENANT_ID_CHECK}/${longTenantId}`;
        let shortTenantId;
        const response = await makeDhpApiCall(token, path, 'GET');

        if (response.status === 200) {
            const json = await response.json();
            // based on requests using the swagger ui from DHP, we can assume identifierTypeId with value 3 contains the short tenant
            const tenantObject = json?.find((item) => item.identifierTypeId === 3);
            shortTenantId = tenantObject?.identifierValue;
            logger.debug({metadata: shortTenantId}, 'Retrieved short code tenant from DHP');
        }

        await setRedisHashMap(TENANT_IDS_HASH, longTenantId, shortTenantId.toUpperCase());

        return shortTenantId;
    } catch (error) {
        logger.error({error, metadata: {longTenantId}}, 'Fetching tenant short code failed');
    }
}

async function fetchTenantLongCode(token, shortTenantId) {
    try {
        const resourceURL = `${ZENITH_CAREGIVER_SITE_CODE_CHECK}/${shortTenantId}`;
        const res = await makeDhpApiCall(token, resourceURL, 'GET');

        logger.debug({metadata: shortTenantId}, 'Retrieved long code tenant from DHP');

        const tenantId = await res.text();

        if (res.status === 200) {
            await setRedisHashMap(TENANT_IDS_HASH, tenantId, shortTenantId.toUpperCase());
        }
        return {tenantId, validTenant: res.status === 200};
    } catch (error) {
        logger.error({error, metadata: {shortTenantId}}, 'Fetching tenant long code failed');
        throw new TenantError({
            message: 'tenantError',
            description: 'Tenant invalid'
        });
    }
}

function findUserRoles(jwtMetadata) {
    const zenithKeys = Object.keys(ZENITH_ROLES);
    const foundRoles = [];
    for (const value of jwtMetadata) {
        const key = zenithKeys.find((key) => ZENITH_ROLES[key] === value);
        if (key) {
            foundRoles.push(OHANA_ROLES[key]);
        }
    }
    return foundRoles;
}

module.exports = {
    fetchAdminIdentity,
    fetchCaregiverTenantIdentifier,
    fetchPatientInformationFromZenithAPI,
    fetchTenantShortCode
};
