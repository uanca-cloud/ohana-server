const {getDatabasePool} = require('../DatabasePoolFactory'),
    {DB_CONNECTION_POOLS, MAX_FIXED_CONTENTS} = require('../constants'),
    {getLogger} = require('../logs/LoggingService'),
    {createLocationFixedContentTemplate} = require('../EntitiesFactory'),
    {DBError, UserInputError} = require('../custom-errors'),
    {areEqualArrays} = require('../DaoHelper'),
    {getLocationById} = require('../location/LocationDao');

const logger = getLogger('FixedContentsDao');

async function getLocationFixedContents(locationFixedContent) {
    logger.debug('Getting location fixed contents...');
    const {locationId, tenantId} = locationFixedContent;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    let locationFixedContentsQuery = `SELECT 
                                        id, 
                                        title, 
                                        url, 
                                        color, 
                                        content_order 
                                      FROM location_fixed_contents 
                                      WHERE tenant_id = $1 and location_id IS NULL 
                                      ORDER BY content_order ASC;`;
    let params = [tenantId];

    if (locationId) {
        locationFixedContentsQuery = `SELECT 
                                        id, 
                                        title, 
                                        url, 
                                        color, 
                                        content_order 
                                      FROM location_fixed_contents 
                                      WHERE tenant_id = $1 and location_id = $2 
                                      ORDER BY content_order ASC;`;
        params.push(locationId);
    }

    const result = await pool.query(locationFixedContentsQuery, params);

    if (!result.rowCount) {
        logger.info({metadata: {locationId, tenantId}}, 'No location fixed contents where found');
        return [];
    }

    return result.rows.map((element) => {
        return createLocationFixedContentTemplate({
            id: element.id,
            title: element.title,
            url: element.url,
            color: element.color,
            order: element.content_order
        });
    });
}

async function getAllLocationFixedContents(locationFixedContent) {
    logger.debug('Getting location and site wide fixed contents...');
    const {locationId, tenantId} = locationFixedContent;
    const allLocationFixedContentsQuery = `SELECT 
                                                id, 
                                                title, 
                                                url, 
                                                color, 
                                                content_order 
                                           FROM location_fixed_contents 
                                           WHERE (location_id = $1 OR location_id IS NULL) and tenant_id = $2 
                                           ORDER BY location_id ASC, content_order ASC;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(allLocationFixedContentsQuery, [locationId, tenantId]);

    if (!result.rowCount) {
        logger.info(
            {metadata: {locationId, tenantId}},
            'No fixed contents for this location or site wide where found'
        );
        return [];
    }

    return result.rows.map((element) => {
        return createLocationFixedContentTemplate({
            id: element.id,
            title: element.title,
            url: element.url,
            color: element.color,
            order: element.content_order
        });
    });
}

async function createLocationFixedContent(locationFixedContent) {
    logger.debug('Creating location fixed content...');
    const {
            locationId,
            fixedContent: {title, url, color},
            tenantId
        } = locationFixedContent,
        location = await getLocationById(locationId);

    if (!location) {
        logger.error({metadata: {tenantId, locationId}}, 'Invalid location');
        throw new UserInputError({message: 'Invalid location'});
    }

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT),
        locationFixedContentsQuery = `SELECT id, content_order
                                        FROM location_fixed_contents
                                        WHERE location_id = $1 and tenant_id = $2;`,
        locationFixedContentsInsertQuery = `INSERT INTO location_fixed_contents
                                    (location_id, title, url, color, content_order, tenant_id)
                                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
        locationFixedContents = await pool.query(locationFixedContentsQuery, [
            locationId,
            tenantId
        ]);

    if (locationFixedContents.rowCount >= MAX_FIXED_CONTENTS) {
        logger.error(
            {metadata: {tenantId, locationId}},
            'Maximum number of fixed contents reached'
        );
        throw new UserInputError({message: 'Maximum number of fixed contents reached'});
    }

    if (locationFixedContents.rowCount > 0) {
        const values = locationFixedContents.rows
                .map((row) => `(${row.id}, ${row.content_order + 1})`)
                .join(','),
            locationFixedContentsOrderUpdateQuery = `UPDATE location_fixed_contents as l 
                                                    SET content_order = c.content_order
                                                    FROM (values ${values}) as c(id, content_order)
                                                    WHERE c.id = l.id AND tenant_id = $1`;

        await pool.query(locationFixedContentsOrderUpdateQuery, [tenantId]);
    }

    const result = await pool.query(locationFixedContentsInsertQuery, [
        locationId,
        title,
        url,
        color,
        1,
        tenantId
    ]);

    if (!result.rowCount) {
        logger.error(
            {metadata: {tenantId, locationId}},
            'Something went wrong when creating a new fixed content'
        );
        throw new DBError({description: 'Something went wrong when creating a new fixed content'});
    }

    return createLocationFixedContentTemplate({
        id: result.rows[0].id,
        title: result.rows[0].title,
        url: result.rows[0].url,
        color: result.rows[0].color,
        order: result.rows[0].content_order
    });
}

async function createSiteWideFixedContent(locationFixedContent) {
    logger.debug('Creating site wide fixed content...');
    const {
            fixedContent: {title, url, color},
            tenantId
        } = locationFixedContent,
        pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT),
        sitewideFixedContentsQuery = `SELECT id, content_order
                                    FROM location_fixed_contents
                                    WHERE location_id IS NULL and tenant_id = $1;`,
        sitewideFixedInsertQuery = `INSERT INTO location_fixed_contents 
                                    (title, url, color, content_order, tenant_id)
                                    VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
        sitewideFixedContents = await pool.query(sitewideFixedContentsQuery, [tenantId]);

    if (sitewideFixedContents.rowCount >= MAX_FIXED_CONTENTS) {
        logger.error({metadata: {tenantId}}, 'Maximum number of site wide fixed contents reached');
        throw new UserInputError({message: 'Maximum number of site wide fixed contents reached'});
    }

    if (sitewideFixedContents.rowCount > 0) {
        const values = sitewideFixedContents.rows
                .map((row) => `(${row.id}, ${row.content_order + 1})`)
                .join(','),
            sitewideFixedContentsOrderUpdateQuery = `UPDATE location_fixed_contents as l 
                                                    SET content_order = c.content_order 
                                                    FROM (values ${values}) as c(id, content_order)
                                                    WHERE c.id = l.id AND tenant_id = $1`;

        await pool.query(sitewideFixedContentsOrderUpdateQuery, [tenantId]);
    }

    const result = await pool.query(sitewideFixedInsertQuery, [title, url, color, 1, tenantId]);

    if (!result.rowCount) {
        logger.error(
            {metadata: {tenantId}},
            'Something went wrong when creating a new fixed content'
        );
        throw new DBError({description: 'Something went wrong when creating a new fixed content'});
    }

    return createLocationFixedContentTemplate({
        id: result.rows[0].id,
        title: result.rows[0].title,
        url: result.rows[0].url,
        color: result.rows[0].color,
        order: result.rows[0].content_order
    });
}

async function updateLocationFixedContent(locationFixedContent) {
    logger.debug('Updating location fixed content...');
    const {
        id,
        fixedContent: {title, url, color},
        tenantId
    } = locationFixedContent;
    const locationFixedContentsQuery = `UPDATE location_fixed_contents 
                                        SET title = $1, url = $2, color = $3
                                        WHERE id = $4 and tenant_id = $5
                                        RETURNING *;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationFixedContentsQuery, [title, url, color, id, tenantId]);
    if (!result.rowCount) {
        logger.error(
            {metadata: {tenantId, fixedContentId: id}},
            'Incorrect fixed Content ID or tenant ID'
        );
        throw new DBError({
            message: 'invalidIds',
            description: 'Incorrect fixed Content ID or tenant ID'
        });
    }
    return createLocationFixedContentTemplate({
        id: result.rows[0].id,
        title: result.rows[0].title,
        url: result.rows[0].url,
        color: result.rows[0].color,
        order: result.rows[0].content_order
    });
}

async function deleteLocationFixedContent(locationFixedContent) {
    logger.debug('Deleting location fixed content...');
    const {fixedContentId: id, tenantId} = locationFixedContent;
    const locationFixedContentsQuery = `DELETE FROM location_fixed_contents
                                        WHERE id = $1 and tenant_id = $2;`;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationFixedContentsQuery, [id, tenantId]);
    if (!result.rowCount) {
        logger.error(
            {metadata: {tenantId, fixedContentId: id}},
            'Incorrect fixed Content ID or tenant ID'
        );
        throw new DBError({
            message: 'invalidIds',
            description: 'Incorrect fixed Content ID or tenant ID'
        });
    }
    return true;
}

async function updateLocationFixedContentsOrder(locationFixedContents) {
    logger.debug('Updating location fixed content order...');
    const {locationId, tenantId, fixedContentsIds} = locationFixedContents;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const presentLocationFixedContents = await getLocationFixedContents({locationId, tenantId});
    const presentLocationFixedContentsIds = presentLocationFixedContents.map(
        (fixedContent) => `${fixedContent.id}`
    );

    if (!areEqualArrays(fixedContentsIds, presentLocationFixedContentsIds)) {
        logger.error(
            {metadata: {locationId, tenantId, fixedContentsIds}},
            'Fixed content ids mismatch'
        );
        throw new DBError({
            message: 'invalidFixedContent',
            description: 'Fixed content ids mismatch'
        });
    }

    // map messageIds to a message order, ordering starts from 1
    let values = '';
    fixedContentsIds.forEach((current, index) => {
        values += `(${current}, ${index + 1}),`;
    });
    values = values.slice(0, -1);

    const locationFixedContentOrderQuery = `UPDATE location_fixed_contents as l
                                            SET content_order = c.content_order 
                                            FROM (values ${values}) as c(id, content_order)
                                            WHERE c.id = l.id AND tenant_id = $1 RETURNING location_id`;

    const result = await pool.query(locationFixedContentOrderQuery, [tenantId]);

    if (!result.rowCount) {
        logger.error(
            {metadata: {locationId, tenantId, fixedContentsIds}},
            'Incorrect fixed content ID or tenant ID'
        );
        throw new DBError({
            message: 'invalidIds',
            description: 'Incorrect fixed content ID or tenant ID'
        });
    }

    return getLocationFixedContents({locationId, tenantId});
}

module.exports = {
    getLocationFixedContents,
    createLocationFixedContent,
    updateLocationFixedContent,
    deleteLocationFixedContent,
    updateLocationFixedContentsOrder,
    createSiteWideFixedContent,
    getAllLocationFixedContents
};
